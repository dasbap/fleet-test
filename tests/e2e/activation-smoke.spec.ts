import { test, expect } from "@playwright/test";

test.describe("SPA & PWA smoke (activation layout)", () => {
  test("charge la racine sans erreur critique (desktop/mobile)", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");

    const root = page.locator("#root");
    await expect(root).toBeVisible();

    // On tolère des warnings, mais pas d'erreur JS brutale type ReferenceError
    const hardErrors = consoleErrors.filter((e) =>
      /ReferenceError|TypeError|SyntaxError|Uncaught/i.test(e),
    );
    expect(hardErrors, `Erreurs console bloquantes: ${hardErrors.join("\n")}`).toHaveLength(0);
  });

  test("sert bien le fallback PWA offline.html", async ({ page }) => {
    const response = await page.goto("/offline.html");
    expect(response?.ok()).toBeTruthy();

    const html = await page.content();
    expect(html).toMatch(/Hors ligne|Connexion indisponible/i);
  });
});

