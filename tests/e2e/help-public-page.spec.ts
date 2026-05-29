import { expect, test } from "@playwright/test";

/** Page publique /help (layout HelpPublicLayout + contenu). */
test("affiche le centre d'aide avec en-tête de navigation", async ({ page }) => {
  await page.goto("/help", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /Centre d'aide E-Samba/i }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("link", { name: "Accueil E-Samba" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Connexion" })).toBeVisible();
});
