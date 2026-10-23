import { test, expect } from "@playwright/test";
test("price sorting changes the catalog and survives refresh", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Ordenação", { exact: true }).selectOption("price-asc");
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(page.locator(".catalog-results .card h3").first()).toHaveText(
    "Golden Signal #160",
  );
  await page
    .getByLabel("Ordenação", { exact: true })
    .selectOption("price-desc");
  await expect(page.locator(".catalog-results .card h3").first()).toHaveText(
    "Electric Soul",
  );
  await page.reload();
  await expect(page.getByLabel("Ordenação", { exact: true })).toHaveValue(
    "price-desc",
  );
  await expect(page.locator(".catalog-results .card h3").first()).toHaveText(
    "Electric Soul",
  );
});
test("artwork views and zoom are keyboard accessible", async ({ page }) => {
  await page.goto("/nft/nft-1");
  await page
    .getByRole("button", { name: "Detalhe do rosto", exact: true })
    .click();
  await expect(page.locator(".gallery-stage")).toHaveAttribute(
    "data-view",
    "face",
  );
  const zoom = page.getByRole("button", { name: "Ampliar arte", exact: true });
  await zoom.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Arte de Emerald Ape #042" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(zoom).toBeFocused();
  await page
    .getByRole("button", { name: "Arte completa", exact: true })
    .click();
  await expect(page.locator(".gallery-stage")).toHaveAttribute(
    "data-view",
    "full",
  );
});
test("price bounds combine with category and search and survive history", async ({
  page,
}) => {
  await page.goto("/");
  if ((page.viewportSize()?.width || 1440) < 701)
    await page
      .getByRole("button", { name: "Abrir filtros da coleção" })
      .click();
  await page
    .getByRole("button", { name: "Fotografia 08", exact: true })
    .click();
  await page.getByLabel("Mínimo", { exact: true }).fill("1.30");
  await page.getByLabel("Máximo", { exact: true }).fill("1.80");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  // TanStack encodes numeric-looking strings as JSON to preserve decimal precision.
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get("minPrice") === '"1.30"' &&
      url.searchParams.get("maxPrice") === '"1.80"',
  );
  await page.getByLabel("Buscar NFTs").fill("Sage");
  await expect(
    page.getByText("1 obra encontrada", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".catalog-results .card h3")).toHaveText([
    "Sage Nomad #009",
  ]);
  await page.reload();
  await expect(page.getByLabel("Mínimo", { exact: true })).toHaveValue("1.30");
  await expect(page.getByLabel("Máximo", { exact: true })).toHaveValue("1.80");
  await page.getByLabel("Buscar NFTs").fill("nonexistent");
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(
    page.getByText("24 obras encontradas", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Mínimo", { exact: true })).toHaveValue("");
  await page.goBack();
  await expect(page.getByLabel("Mínimo", { exact: true })).toHaveValue("1.30");
});
test("a slower obsolete search is cancelled before it can replace newer results", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("jungle-scenario", "variable"),
  );
  await page.goto("/");
  await expect(
    page.getByText("24 obras encontradas", { exact: true }),
  ).toBeVisible();
  const obsolete = page.waitForRequest(
    (r) =>
      new URL(r.url()).pathname === "/api/nfts" &&
      new URL(r.url()).searchParams.get("q") === "Emerald",
  );
  await page.getByLabel("Buscar NFTs").fill("Emerald");
  const request = await obsolete;
  const cancelled = page.waitForEvent("requestfailed", {
    predicate: (r) => r === request,
  });
  await page.getByLabel("Buscar NFTs").fill("Sage");
  await cancelled;
  await expect(page.locator(".catalog-results .card h3")).toHaveText([
    "Sage Nomad #009",
  ]);
  await expect(page.getByLabel("Buscar NFTs")).toHaveValue("Sage");
});
test("filters survive refresh and browser history", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText("24 obras encontradas", { exact: true }),
  ).toBeVisible();
  if ((page.viewportSize()?.width || 1440) < 701)
    await page
      .getByRole("button", { name: "Abrir filtros da coleção" })
      .click();
  await page
    .getByRole("button", { name: "Fotografia 08", exact: true })
    .click();
  await expect(
    page.getByText("8 obras encontradas", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Buscar NFTs").fill("Sage");
  await expect(
    page.getByText("1 obra encontrada", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Buscar NFTs")).toHaveValue("Sage");
  await page.getByLabel("Buscar NFTs").fill("nonexistent");
  await expect(
    page.getByRole("heading", { name: "Nenhuma obra encontrada" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Buscar NFTs")).toHaveValue("Sage");
});
test("pagination, direct detail and unknown resource", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.getByText("2 / 3", { exact: true })).toBeVisible();
  await page.goto("/nft/nft-1");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await page.goto("/nft/missing");
  await expect(
    page.getByRole("heading", { name: "NFT indisponível" }),
  ).toBeVisible();
});
test("network failure recovers and slow responses show skeletons", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("jungle-scenario"))
      localStorage.setItem("jungle-scenario", "slow");
  });
  await page.goto("/");
  await expect(
    page.getByRole("status", { name: "Carregando catálogo" }),
  ).toBeVisible();
  await expect(
    page.getByText("24 obras encontradas", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => localStorage.setItem("jungle-scenario", "error"));
  await page.reload();
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 15000 });
  await page.evaluate(() => localStorage.removeItem("jungle-scenario"));
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByText("24 obras encontradas", { exact: true }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
});
