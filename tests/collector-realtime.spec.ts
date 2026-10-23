import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import path from "node:path";
async function login(
  page: Page,
  destination = "/account",
  email = "alex@example.test",
  password = "Jungle123!",
) {
  await page.goto(`/login?returnTo=${encodeURIComponent(destination)}`);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(destination);
  await expect(page.getByTestId("realtime-status")).toHaveText(
    "Atualizações conectadas",
  );
}
async function demo(
  page: Page,
  endpoint: string,
  body: Record<string, unknown>,
) {
  const response = await page.evaluate(
    async ({ endpoint, body }) => {
      const token = localStorage.getItem("jungle-token");
      const response = await fetch(`/api/demo/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    },
    { endpoint, body },
  );
  expect(response.status).toBe(200);
  return response.body;
}
async function prepareCheckout(page: Page) {
  await login(page, "/nft/nft-1");
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("NFT adicionado");
  await page.goto("/checkout");

  await expect(page.getByTestId("realtime-status")).toHaveText(
    "Atualizações conectadas",
  );
  await page
    .getByRole("combobox", { name: "Carteira", exact: true })
    .selectOption("wallet-1");
  await page
    .getByRole("button", { name: "Conectar carteira simulada" })
    .click();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar compra simulada" }),
  ).toBeEnabled();
}
test("favorites optimistically roll back on failure, persist and stay private", async ({
  page,
}) => {
  await login(page, "/nft/nft-1");
  await page.evaluate(() =>
    localStorage.setItem("jungle-scenario", "favorite-error"),
  );
  await page
    .getByRole("button", { name: "Adicionar Emerald Ape #042 aos favoritos" })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Remover Emerald Ape #042 dos favoritos",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("alert")).toContainText(
    "estado anterior foi restaurado",
  );
  await expect(
    page.getByRole("button", {
      name: "Adicionar Emerald Ape #042 aos favoritos",
    }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.evaluate(() => localStorage.removeItem("jungle-scenario"));
  await page
    .getByRole("button", { name: "Adicionar Emerald Ape #042 aos favoritos" })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Remover Emerald Ape #042 dos favoritos",
    }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Remover Emerald Ape #042 dos favoritos",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "/nft/nft-1", "luna@example.test");
  await expect(
    page.getByRole("button", {
      name: "Adicionar Emerald Ape #042 aos favoritos",
    }),
  ).toHaveAttribute("aria-pressed", "false");
});
test("profile, image validation, avatar and password persist through refresh", async ({
  page,
}) => {
  await login(page);
  await page
    .getByLabel("E-mail do perfil", { exact: true })
    .fill("luna@example.test");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("alert")).toContainText("Já existe uma conta");
  await page
    .getByLabel("E-mail do perfil", { exact: true })
    .fill("alex.updated@example.test");
  await page
    .getByLabel("Nome de usuário", { exact: true })
    .fill("luna.collector");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "nome de usuário já está em uso",
  );
  await page
    .getByLabel("Nome de usuário", { exact: true })
    .fill("alex.updated");
  await page
    .getByLabel("Nome ENS (opcional)", { exact: true })
    .fill("invalid-ens");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("alert")).toContainText("terminado em .eth");
  await page
    .getByLabel("Nome ENS (opcional)", { exact: true })
    .fill("alex-updated.eth");
  await page
    .getByLabel("Apelido da carteira", { exact: true })
    .fill("Main Vault");
  await page
    .getByLabel("Nome de exibição", { exact: true })
    .fill("Alex Updated");
  await page
    .getByRole("textbox", { name: "Biografia", exact: true })
    .fill("Colecionando novas perspectivas.");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(
    page.getByRole("heading", { name: "Olá, Alex Updated" }),
  ).toBeVisible();
  await page.getByLabel("Foto do perfil", { exact: true }).setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("invalid image"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "arquivo de imagem é inválido",
  );
  await page
    .getByLabel("Foto do perfil", { exact: true })
    .setInputFiles(path.resolve("tests/fixtures/avatar.png"));
  await expect(page.getByAltText("Avatar de Alex Updated")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nome de usuário", { exact: true })).toHaveValue(
    "alex.updated",
  );
  await expect(
    page.getByLabel("Nome ENS (opcional)", { exact: true }),
  ).toHaveValue("alex-updated.eth");
  await expect(
    page.getByLabel("Apelido da carteira", { exact: true }),
  ).toHaveValue("Main Vault");
  await expect(
    page.getByRole("textbox", { name: "Biografia", exact: true }),
  ).toHaveValue("Colecionando novas perspectivas.");
  await expect(page.getByAltText("Avatar de Alex Updated")).toBeVisible();
  await page.getByLabel("Senha atual", { exact: true }).fill("wrongpassword");
  await page.getByLabel("Nova senha", { exact: true }).fill("NewJungle456!");
  await page
    .getByRole("button", { name: "Mostrar nova senha", exact: true })
    .click();
  await expect(page.getByLabel("Nova senha", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Ocultar nova senha", exact: true })
    .click();
  await expect(page.getByLabel("Nova senha", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("Different456!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("não corresponde");
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("NewJungle456!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "senha atual está incorreta",
  );
  await page.getByLabel("Senha atual", { exact: true }).fill("Jungle123!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(
    page.getByText("Senha alterada com sucesso.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "/account", "alex.updated@example.test", "NewJungle456!");
  await expect(
    page.getByRole("heading", { name: "Olá, Alex Updated" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
});
test("socket price change requires a new review and discards duplicate and stale events", async ({
  page,
}) => {
  await prepareCheckout(page);
  await demo(page, "nft", { id: "nft-1", price: "2.5", delivery: "duplicate" });
  await expect(
    page.getByText(
      "Preço ou disponibilidade de Emerald Ape #042 atualizado. Revise seu carrinho.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmar compra simulada" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.locator(".totals dd").last()).toHaveText("2.5025 ETH");
  await expect(
    page.getByRole("button", { name: "Confirmar compra simulada" }),
  ).toBeEnabled();
  await demo(page, "nft", { id: "nft-1", delivery: "stale" });
  await expect(page.locator(".totals dd").last()).toHaveText("2.5025 ETH");
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".totals dd").last()).toHaveText("2.5025 ETH");
});
test("stock event prevents a stale checkout", async ({ page }) => {
  await prepareCheckout(page);
  await demo(page, "nft", { id: "nft-1", stock: 0 });
  await expect(
    page.getByRole("button", { name: "Confirmar compra simulada" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "disponibilidade" }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(
    page.getByText(
      "Disponibilidade alterada: restam 0. Ajuste ou remova este item.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remover Emerald Ape #042", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio." }),
  ).toBeVisible();
});
test("order event confirms without polling and never regresses to pending", async ({
  page,
}) => {
  await prepareCheckout(page);
  await page.evaluate(() => localStorage.setItem("jungle-scenario", "pending"));
  let reads = 0;
  page.on("request", (request) => {
    if (request.method() === "GET" && /\/api\/orders\//.test(request.url()))
      reads++;
  });
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido em processamento" }),
  ).toBeVisible();

  await expect(page.getByTestId("realtime-status")).toHaveText(
    "Atualizações conectadas",
  );
  await expect.poll(() => reads).toBeGreaterThan(0);
  const before = reads,
    id = new URL(page.url()).pathname.split("/").pop()!;
  await demo(page, "order", { id, delivery: "settle" });
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toBeVisible({ timeout: 5000 });
  expect(reads).toBe(before);
  await demo(page, "order", { id, delivery: "stale" });
  await demo(page, "order", { id, delivery: "duplicate" });
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toBeVisible();
});
test("reconnection reconciles a pending order with REST and refresh preserves its receipt", async ({
  page,
}) => {
  await prepareCheckout(page);
  await page.evaluate(() => localStorage.setItem("jungle-scenario", "pending"));
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido em processamento" }),
  ).toBeVisible();

  await expect(page.getByTestId("realtime-status")).toHaveText(
    "Atualizações conectadas",
  );
  const connection = await page
      .getByTestId("realtime-status")
      .getAttribute("data-connection-id"),
    id = new URL(page.url()).pathname.split("/").pop()!;
  await demo(page, "disconnect", {});
  await demo(page, "order", { id, delivery: "settle" });
  await expect(page.getByTestId("realtime-status")).not.toHaveAttribute(
    "data-connection-id",
    connection!,
  );
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toBeVisible();
  const count = await page.evaluate(
    () => JSON.parse(localStorage.getItem("jungle-database-v2")!).orders.length,
  );
  expect(count).toBe(1);
});

test("logout releases the old subscription before another user receives events", async ({
  page,
}) => {
  await prepareCheckout(page);
  await page.evaluate(() => localStorage.setItem("jungle-scenario", "pending"));
  await page.getByRole("button", { name: "Confirmar compra simulada" }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido em processamento" }),
  ).toBeVisible();
  const orderUrl = page.url();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "/account", "luna@example.test");
  await demo(page, "advance-orders", {});
  await expect(
    page.getByText("Você ainda não tem pedidos.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, new URL(orderUrl).pathname);
  await expect(
    page.getByRole("heading", { name: "Compra confirmada", exact: true }),
  ).toBeVisible();
});
test("an expired socket session is revalidated and returns to login", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Olá, Alex Collector" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Nome de exibição", { exact: true }),
  ).toHaveValue("Alex Collector");
  // The event deliberately navigates away. Do not await the fixture response
  // body in a page execution context that is about to be destroyed.
  await page.evaluate(() => {
    localStorage.setItem("jungle-scenario", "expired");
    void fetch("/api/demo/nft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "nft-1", price: "1.5" }),
    }).catch(() => undefined);
  });
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await page.evaluate(() => localStorage.removeItem("jungle-scenario"));
  await page.getByLabel("E-mail", { exact: true }).fill("alex@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("Jungle123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Olá, Alex Collector" }),
  ).toBeVisible();
});
