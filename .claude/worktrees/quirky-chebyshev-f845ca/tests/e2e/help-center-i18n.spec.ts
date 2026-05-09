import { expect, test, type Page } from "@playwright/test";

type HelpLocaleCase = {
  locale: "fr" | "en" | "ln";
  bubbleLabel: string;
  panelTitle: string;
  faqTitle: string;
};

const HELP_LOCALE_CASES: HelpLocaleCase[] = [
  {
    locale: "fr",
    bubbleLabel: "Besoin d'aide ?",
    panelTitle: "Centre d'aide",
    faqTitle: "Questions fréquentes",
  },
  {
    locale: "en",
    bubbleLabel: "Need help?",
    panelTitle: "Help Center",
    faqTitle: "Frequently asked questions",
  },
  {
    locale: "ln",
    bubbleLabel: "Bosalisi?",
    panelTitle: "Lisalisi",
    faqTitle: "Mituna ya mingi",
  },
];

async function seedSessionAndLocale(page: Page, locale: HelpLocaleCase["locale"]): Promise<void> {
  await page.addInitScript((nextLocale) => {
    const nowIso = new Date().toISOString();

    window.localStorage.setItem("esamba_lang", nextLocale);
    window.localStorage.setItem("esamba-demo-auth-fallback", "true");
    window.localStorage.setItem(
      "esamba-mock-auth-v1",
      JSON.stringify({
        user: {
          id: "mock-help-e2e-user",
          email: "organizer@esamba.test",
          created_at: nowIso,
          user_metadata: { full_name: "E2E Help User" },
        },
        role: "organizer",
        memberships: [],
      }),
    );
  }, locale);
}

async function mockBillingContext(page: Page): Promise<void> {
  await page.route("**/rest/v1/rpc/get_fleet_billing_context", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        plan_code: "pro",
        ai_enabled: true,
      }),
    });
  });
}

async function openHelpCenter(page: Page, bubbleLabel: string): Promise<void> {
  const bubbleButton = page
    .getByTestId("help-bubble-button")
    .or(page.getByRole("button", { name: bubbleLabel }))
    .or(page.getByRole("button", { name: /Besoin d'aide \?|Need help\?|Bosalisi\?/i }))
    .first();
  await expect(bubbleButton).toBeVisible({ timeout: 15_000 });
  await bubbleButton.click();
}

async function gotoDashboard(page: Page): Promise<void> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 20_000 });
      await page.waitForLoadState("networkidle", { timeout: 10_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await page.waitForTimeout(1_000);
      }
    }
  }

  throw lastError ?? new Error("Navigation dashboard impossible");
}

test.describe("HelpCenter i18n e2e", () => {
  test.describe.configure({ mode: "serial" });

  for (const localeCase of HELP_LOCALE_CASES) {
    test(`ouvre le centre d'aide et affiche les textes ${localeCase.locale}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      await seedSessionAndLocale(page, localeCase.locale);
      await mockBillingContext(page);
      await gotoDashboard(page);

      await openHelpCenter(page, localeCase.bubbleLabel);

      const helpPanel = page.getByTestId("help-center-panel");
      await expect(helpPanel).toBeVisible();
      await expect(helpPanel).toContainText(localeCase.panelTitle);
      await expect(helpPanel).toContainText(localeCase.faqTitle);

      const hardErrors = consoleErrors.filter((entry) =>
        /ReferenceError|TypeError|SyntaxError|Uncaught/i.test(entry),
      );
      expect(
        hardErrors,
        `Erreurs console bloquantes (${localeCase.locale}): ${hardErrors.join("\n")}`,
      ).toHaveLength(0);

      await expect(page.getByTestId("help-bubble-button")).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });
  }
});
