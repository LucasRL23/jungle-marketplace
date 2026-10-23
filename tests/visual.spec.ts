import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function capture(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  for (const image of await page.locator("main img").all()) {
    if (!(await image.isVisible())) continue;
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(async (img: HTMLImageElement) => {
      await img.decode();
    });
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    animations: "disabled",
    maxDiffPixelRatio: 0.005,
  });
}

test("catalog, detail, cart and checkout visual baselines", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("24 obras encontradas", { exact: true }),
  ).toBeVisible();
  await capture(page, "catalog.png");
  await page.goto("/nft/nft-1");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await capture(page, "detail.png");
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("NFT adicionado");
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await capture(page, "cart.png");
  await page.getByRole("link", { name: "Ir para pagamento" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill("alex@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("Jungle123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pagamento", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Carteira", exact: true }),
  ).toBeVisible();
  await capture(page, "checkout.png");
});

test("collector profile and wallets visual baselines", async ({ page }) => {
  await page.goto("/account");
  await page.getByLabel("E-mail", { exact: true }).fill("alex@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("Jungle123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByLabel("Nome de usuário", { exact: true })).toHaveValue(
    "alex.collector",
  );
  await capture(page, "profile.png");
  const menu = page.getByRole("navigation", { name: "Menu do colecionador" });
  await expect(menu.locator('[aria-current="page"]')).toHaveCount(1);
  await menu.getByRole("link", { name: "Atividade", exact: true }).click();
  await expect(page).toHaveURL(/#orders$/);
  await expect(
    menu.getByRole("link", { name: "Atividade", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(menu.locator('[aria-current="page"]')).toHaveCount(1);
  await menu
    .getByRole("link", { name: "Lista de interesse", exact: true })
    .click();
  await expect(page).toHaveURL(/#favorites$/);
  await expect(
    menu.getByRole("link", { name: "Lista de interesse", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(menu.locator('[aria-current="page"]')).toHaveCount(1);
  await page
    .getByRole("navigation", { name: "Menu do colecionador" })
    .getByRole("link", { name: "Carteiras", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Editar Primary wallet", exact: true }),
  ).toBeVisible();
  await capture(page, "wallets.png");
});
