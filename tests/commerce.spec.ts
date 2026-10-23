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
    page.getByRole("heading", { name: "Emerald Ape #042" }),
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
  await page
    .getByRole("combobox", { name: "Carteira", exact: true })
    .selectOption("wallet-1");
  await page
    .getByRole("combobox", { name: "Rede", exact: true })
    .selectOption("Polygon");
  await expect(
    page.getByRole("button", { name: "Conectar carteira simulada" }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText("Rede incompatível");
  await page
    .getByRole("combobox", { name: "Rede", exact: true })
    .selectOption("Ethereum");
  await page
    .getByLabel("Observação do colecionador (opcional)", { exact: true })
    .fill("Minha primeira obra da coleção.");
  await review(page);
  await page.getByLabel("Nome completo", { exact: true }).fill("Alex Purchase");
  await expect(
    page.getByRole("button", { name: "Confirmar compra simulada" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(page).toHaveURL(/\/orders\//);
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toBeVisible();
  const orderUrl = page.url();
  const receipt = await page.locator(".totals dd").allTextContents();
  expect(receipt).toEqual([
    "1.19 ETH",
    "−0.119 ETH",
    "0.0025 ETH",
    "1.0735 ETH",
  ]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".totals dd")).toHaveText(receipt);
  await expect(
    page.getByText("Minha primeira obra da coleção.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Alex Purchase · alex@example.test", { exact: true }),
  ).toBeVisible();
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
test("edition limits, quantity changes and coupon removal keep API totals exact", async ({
  page,
}) => {
  await page.goto("/nft/nft-1");
  await page
    .getByRole("combobox", { name: "Edição", exact: true })
    .selectOption("limited");
  const more = page.getByRole("button", {
    name: "Aumentar quantidade do NFT",
    exact: true,
  });
  await more.click();
  await more.click();
  await expect(page.getByLabel("Quantidade", { exact: true })).toHaveValue("3");
  await expect(more).toBeDisabled();
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("NFT adicionado");
  await page.goto("/cart");
  const total = page.locator(".cart-summary .totals dd").last();
  await expect(total).toHaveText("7.1425 ETH");
  await page
    .getByRole("button", {
      name: "Diminuir quantidade de Emerald Ape #042",
      exact: true,
    })
    .click();
  await expect(total).toHaveText("4.7625 ETH");
  await page.getByLabel("Cupom", { exact: true }).fill("EXPIRED");
  await page
    .getByRole("button", { name: "Aplicar cupom", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("expirou");
  await page.getByLabel("Cupom", { exact: true }).fill("JUNGLE10");
  await page
    .getByRole("button", { name: "Aplicar cupom", exact: true })
    .click();
  await expect(total).toHaveText("4.2865 ETH");
  await page
    .getByRole("button", { name: "Remover cupom", exact: true })
    .click();
  await expect(total).toHaveText("4.7625 ETH");
  await page
    .getByRole("button", { name: "Remover Emerald Ape #042", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio." }),
  ).toBeVisible();
});

test("editing collector data during a quote requires a new review", async ({
  page,
}) => {
  await addNft(page);
  await page.goto("/checkout");
  await login(page);
  await page
    .getByRole("combobox", { name: "Carteira", exact: true })
    .selectOption("wallet-1");
  await page
    .getByRole("button", { name: "Conectar carteira simulada" })
    .click();
  await page.evaluate(() => localStorage.setItem("jungle-scenario", "slow"));
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("button", { name: "Validando…" })).toBeVisible();
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Updated Collector");
  await page.evaluate(() => localStorage.removeItem("jungle-scenario"));
  await expect(
    page.getByRole("button", { name: "Revisar pedido" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Confirmar compra simulada" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar compra simulada" }),
  ).toBeEnabled();
  await expect(
    page.getByText("Updated Collector · alex@example.test", { exact: true }),
  ).toBeVisible();
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
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
});
test("pending settlement advances under a controlled clock and persists", async ({
  page,
}) => {
  await addNft(page);
  await page.goto("/checkout");
  await login(page);
  await review(page);
  await page.clock.install({ time: await page.evaluate(() => Date.now()) });
  await page.evaluate(() => localStorage.setItem("jungle-scenario", "pending"));
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido em processamento", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(31000);
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("jungle-database-v2")!).orders.length,
    ),
  ).toBe(1);
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
    .getByLabel("Nome de usuário", { exact: true })
    .fill("test.collector");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("collector@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("Jungle123!");
  await page
    .getByLabel("Confirmar senha", { exact: true })
    .fill("WrongPassword123!");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "confirmação da senha não corresponde",
  );
  await page.getByLabel("Confirmar senha", { exact: true }).fill("Jungle123!");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Test", exact: true }),
  ).toBeVisible();
  await page.goto("/wallets");
  await page.getByLabel("Nome da carteira").fill("My wallet");
  await page.getByLabel("Endereço da carteira").fill("invalid");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByRole("alert")).toContainText("endereço");
  await expect(page.getByLabel("Endereço da carteira")).toHaveAttribute(
    "aria-describedby",
    "wallet-error",
  );
  await page.getByLabel("Endereço da carteira").fill(`0x${"a".repeat(40)}`);
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByRole("status")).toContainText("Carteira salva");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "My wallet", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Nome da carteira").fill("Secondary vault");
  await page.getByLabel("Endereço da carteira").fill(`0x${"b".repeat(40)}`);
  await page
    .getByRole("combobox", { name: "Rede", exact: true })
    .selectOption("Polygon");
  await page
    .getByRole("button", { name: "Salvar carteira", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar Secondary vault", exact: true })
    .click();
  await page.getByLabel("Nome da carteira").fill("Updated vault");
  await page
    .getByRole("button", { name: "Salvar carteira", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Carteira salva");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Updated vault", exact: true }),
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
