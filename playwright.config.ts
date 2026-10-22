import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  timeout: 90000,
  expect: { timeout: 15000 },
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  reporter: [["html", { open: "never" }], ["list"]],
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
