import { test, expect } from "@playwright/test";
test("filters survive refresh and browser history", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("24 artworks", { exact: true })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Categoria", exact: true })
    .selectOption("Photography");
  await expect(page.getByText("8 artworks", { exact: true })).toBeVisible();
  await page.getByLabel("Buscar NFTs").fill("Golden");
  await expect(page.getByText("1 artworks", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Buscar NFTs")).toHaveValue("Golden");
  await page.getByLabel("Buscar NFTs").fill("nonexistent");
  await expect(
    page.getByRole("heading", { name: "No artworks found" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Buscar NFTs")).toHaveValue("Golden");
});
test("pagination, direct detail and unknown resource", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.getByText("2 / 3", { exact: true })).toBeVisible();
  await page.goto("/nft/nft-1");
  await expect(
    page.getByRole("heading", { name: "Cosmic Perspective" }),
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
  await expect(page.getByText("24 artworks", { exact: true })).toBeVisible();
  await page.evaluate(() => localStorage.setItem("jungle-scenario", "error"));
  await page.reload();
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 15000 });
  await page.evaluate(() => localStorage.removeItem("jungle-scenario"));
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByText("24 artworks", { exact: true })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
});
