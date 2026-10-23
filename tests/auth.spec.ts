import { test, expect } from "@playwright/test";

test("authentication dialog traps focus, closes with Escape and restores the trigger", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("link", { name: "Entrar", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Bem-vindo de volta",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("E-mail", { exact: true })).toBeFocused();
  await expect(
    page.getByRole("link", { name: "KURIO", exact: true }),
  ).toHaveCount(0);
  for (const direction of ["Tab", "Shift+Tab"])
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press(direction);
      expect(
        await page.evaluate(
          () => !!document.activeElement?.closest('[role="dialog"]'),
        ),
      ).toBe(true);
    }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL((url) => url.pathname === "/");
});

test("auth tabs preserve destination and clear credentials and errors", async ({
  page,
}) => {
  await page.goto("/login?returnTo=%2Fcart");
  await page.getByLabel("E-mail", { exact: true }).fill("alex@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("WrongPassword123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "E-mail ou senha incorretos",
  );
  await page.getByRole("link", { name: "Criar conta", exact: true }).click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/register" &&
      url.searchParams.get("returnTo") === "/cart",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Nome completo", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Fechar acesso à conta" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
