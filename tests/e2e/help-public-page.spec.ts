import { expect, test } from "@playwright/test";

/** Page publique /help (layout HelpPublicLayout + contenu). */
test("affiche le centre d'aide avec en-tête de navigation", async ({ page }) => {
  const failedSupabaseRequests: string[] = [];
  await page.route("**/rest/v1/help_articles**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    }),
  );

  page.on("requestfailed", (request) => {
    if (request.url().includes("supabase.co")) {
      failedSupabaseRequests.push(
        `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`,
      );
    }
  });

  await page.goto("/help", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /Centre d'aide E-Samba/i }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("link", { name: "Accueil E-Samba" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Connexion" })).toBeVisible();
  expect(failedSupabaseRequests).toEqual([]);
});
