import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function addNft(page: Page) {
  await page.goto("/nft/nft-1");
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("NFT adicionado");
}
async function login(page: Page, email = "alex@example.test") {
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("Jungle123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
async function review(page: Page) {
  await page
    .getByRole("combobox", { name: "Carteira", exact: true })
    .selectOption("wallet-1");
  await page
    .getByRole("button", { name: "Conectar carteira simulada" })
    .click();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar compra simulada" }),
  ).toBeVisible();
}
test("visitor cart survives refresh and login; coupon and confirmed receipt", async ({
  page,
}) => {
  await addNft(page);
  await page.goto("/cart");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Cosmic Perspective" }),
  ).toBeVisible();
  await page.getByLabel("Cupom", { exact: true }).fill("INVALID");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
  await expect(page.getByRole("alert")).toContainText("Cupom inválido");
  await page.getByLabel("Cupom", { exact: true }).fill("JUNGLE10");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
  await expect(
    page.getByText("Cupom JUNGLE10 aplicado.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ir para pagamento" }).click();
  await expect(page).toHaveURL(/login\?returnTo=/);
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Pagamento", exact: true }),
  ).toBeVisible();
  await review(page);
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(page).toHaveURL(/\/orders\//);
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toBeVisible();
  const orderUrl = page.url();
  const receipt = await page.locator(".totals dd").allTextContents();
  expect(receipt).toEqual([
    "1.25 ETH",
    "−0.125 ETH",
    "0.0025 ETH",
    "1.1275 ETH",
  ]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".totals dd")).toHaveText(receipt);
  await page.getByRole("link", { name: "Carrinho", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.goto(orderUrl);
  await login(page, "luna@example.test");
  await expect(page.getByRole("alert")).toContainText(
    "Você não tem acesso a este pedido.",
  );
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toHaveCount(0);
});
test("declined payment preserves cart", async ({ page }) => {
  await addNft(page);
  await page.goto("/checkout");
  await login(page);
  await review(page);
  await page.evaluate(() =>
    localStorage.setItem("jungle-scenario", "declined"),
  );
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Voltar ao carrinho", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cosmic Perspective", exact: true }),
  ).toBeVisible();
});
test("timeout recovers the same order after refresh", async ({ page }) => {
  await addNft(page);
  await page.goto("/checkout");
  await login(page);
  await review(page);
  await page.evaluate(() => localStorage.setItem("jungle-scenario", "timeout"));
  await page
    .getByRole("button", { name: "Confirmar compra simulada" })
    .dblclick();
  await expect(
    page.getByRole("button", { name: "Recuperar meu pedido" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("A resposta demorou", {
    timeout: 20000,
  });
  await page.reload();
  await page.getByRole("button", { name: "Recuperar meu pedido" }).click();
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toBeVisible();
  const orderCount = await page.evaluate(
    () => JSON.parse(localStorage.getItem("jungle-database-v2")!).orders.length,
  );
  expect(orderCount).toBe(1);
});
test("register validation, wallet persistence, logout and user isolation", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel("Nome completo").fill("Test Collector");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("collector@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("Jungle123!");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Test", exact: true }),
  ).toBeVisible();
  await page.goto("/wallets");
  await page.getByLabel("Nome da carteira").fill("My wallet");
  await page.getByLabel("Endereço da carteira").fill("invalid");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByRole("alert")).toContainText("endereço");
  await page.getByLabel("Endereço da carteira").fill(`0x${"a".repeat(40)}`);
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByRole("status")).toContainText("Carteira salva");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "My wallet", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.goto("/account");
  await expect(page).toHaveURL(/login/);
  await login(page, "luna@example.test");
  await expect(
    page.getByRole("heading", { name: "Olá, Luna Collector" }),
  ).toBeVisible();
  await page.goto("/wallets");
  await expect(
    page.getByRole("heading", { name: "My wallet", exact: true }),
  ).toHaveCount(0);
});
test("session expiry during checkout preserves guest-merged items", async ({
  page,
}) => {
  await addNft(page);
  await page.goto("/checkout");
  await login(page);
  await review(page);
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("jungle-database-v2")!);
    for (const s of Object.values(db.sessions) as { expiresAt: number }[])
      s.expiresAt = 0;
    localStorage.setItem("jungle-database-v2", JSON.stringify(db));
  });
  await page.reload();
  await expect(page).toHaveURL(/login/);
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Pagamento", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Revisar pedido" }),
  ).toBeVisible();
});

test("private-route network failure preserves session and can retry", async ({
  page,
}) => {
  await page.goto("/account");
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Olá, Alex Collector" }),
  ).toBeVisible();
  await page.evaluate(() => localStorage.setItem("jungle-scenario", "offline"));
  await page.goto("/wallets");
  await expect(
    page.getByRole("heading", {
      name: "Não foi possível carregar esta página.",
    }),
  ).toBeVisible();
  await page.evaluate(() => localStorage.removeItem("jungle-scenario"));
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Minhas carteiras", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Alex", exact: true }),
  ).toBeVisible();
});
