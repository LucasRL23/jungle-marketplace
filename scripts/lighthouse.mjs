import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";

const baseUrl = process.env.AUDIT_URL || "http://127.0.0.1:4175";
const directory = "reports/lighthouse";
await mkdir(directory, { recursive: true });
const cli = fileURLToPath(
  new URL("../cli/index.js", import.meta.resolve("lighthouse")),
);
const runs = Number(process.env.AUDIT_RUNS || 3);
if (!Number.isInteger(runs) || runs < 1)
  throw new Error("AUDIT_RUNS must be a positive integer.");
const rows = [];
const buildIndexSha256 = createHash("sha256")
  .update(await readFile("dist/index.html"))
  .digest("hex");
for (const [page, route] of [
  ["catalog", "/"],
  ["detail", "/nft/nft-1"],
]) {
  for (const profile of ["mobile", "desktop"]) {
    for (let run = 1; run <= runs; run++) {
      const output = `${directory}/${page}-${profile}-${run}`;
      console.log(`Auditing ${page}, ${profile}, run ${run}/${runs}`);
      // Use the same headless Chromium binary as the E2E suite; Lighthouse owns
      // measurement, emulation and throttling through the debugging connection.
      const browser = await chromium.launch({
        ...(process.env.CHROME_PATH
          ? { executablePath: process.env.CHROME_PATH }
          : {}),
        headless: true,
        args: ["--remote-debugging-port=9223"],
      });
      const args = [
        cli,
        `${baseUrl}${route}`,
        "--quiet",
        "--port=9223",
        "--output=html",
        "--output=json",
        `--output-path=${output}`,
        "--only-categories=performance,accessibility,best-practices,seo",
        "--chrome-flags=--headless --disable-dev-shm-usage",
      ];
      if (profile === "desktop") args.push("--preset=desktop");
      try {
        await new Promise((resolve, reject) => {
          const child = spawn(process.execPath, args, {
            stdio: "inherit",
            windowsHide: true,
            env: {
              ...process.env,
              CHROME_PATH: process.env.CHROME_PATH || chromium.executablePath(),
            },
          });
          child.on("error", reject);
          child.on("exit", (code) =>
            code === 0
              ? resolve()
              : reject(new Error(`Lighthouse exited with ${code}`)),
          );
        });
      } finally {
        await browser.close();
      }
      const report = JSON.parse(
        await readFile(`${output}.report.json`, "utf8"),
      );
      if (report.runtimeError)
        throw new Error(JSON.stringify(report.runtimeError));
      rows.push({
        page,
        profile,
        run,
        lighthouse: report.lighthouseVersion,
        chrome: report.environment.hostUserAgent,
        settings: report.configSettings,
        scores: Object.fromEntries(
          Object.entries(report.categories).map(([name, result]) => [
            name,
            Math.round(result.score * 100),
          ]),
        ),
        metrics: Object.fromEntries(
          [
            "largest-contentful-paint",
            "cumulative-layout-shift",
            "total-blocking-time",
          ].map((name) => [name, report.audits[name].numericValue]),
        ),
      });
      console.log(JSON.stringify(rows.at(-1).scores));
    }
  }
}
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const medians = [];
for (const page of ["catalog", "detail"])
  for (const profile of ["mobile", "desktop"]) {
    const matching = rows.filter(
      (r) => r.page === page && r.profile === profile,
    );
    medians.push({
      page,
      profile,
      runs: matching.length,
      scores: Object.fromEntries(
        Object.keys(matching[0].scores).map((key) => [
          key,
          median(matching.map((r) => r.scores[key])),
        ]),
      ),
      metrics: Object.fromEntries(
        Object.keys(matching[0].metrics).map((key) => [
          key,
          median(matching.map((r) => r.metrics[key])),
        ]),
      ),
    });
  }
await writeFile(
  `${directory}/summary.json`,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      baseUrl,
      buildIndexSha256,
      environment: {
        platform: process.platform,
        release: os.release(),
        cpu: os.cpus()[0]?.model,
        memoryGiB: Math.round(os.totalmem() / 1024 ** 3),
        node: process.version,
      },
      note: "Production Vite preview with the same MSW-backed app and original artwork. Each CLI invocation uses a fresh Chrome profile; default simulated throttling. Desktop uses Lighthouse's desktop preset. Medians are computed independently per metric. Baseline screenshots are regression checks of the implementation, not pixel comparisons against Figma.",
      medians,
      rows,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(medians, null, 2));
