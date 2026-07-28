import { expect, test, type Page } from "@playwright/test";
import { activateMockAuthSession, enableMockAuthSession } from "./helpers/mock-auth";

/**
 * Mocks Supabase pour la page billing.
 * Playwright LIFO : enregistrer le catch-all REST **avant** les routes spécifiques
 * (voir help-center-i18n.spec.ts).
 */
async function mockSupabaseForBilling(page: Page): Promise<void> {
  const billingRpcCalls: string[] = [];
  const requestFailures: string[] = [];
  const consoleErrors: string[] = [];

  page.on("requestfailed", (request) => {
    requestFailures.push(
      `${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "unknown"}`,
    );
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.route("**/realtime/v1/**", (route) => route.abort());
  await page.route("**/auth/v1/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.route("**/rest/v1**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/rest/v1/rpc/get_fleet_billing_context**", async (route) => {
    billingRpcCalls.push(`${route.request().method()} ${route.request().url()}`);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        plan_code: "starter",
        plan_name: "Starter",
        is_paid: true,
        billing_status: "active",
        vehicle_count: 2,
        active_vehicles: 2,
        vehicle_slots: 25,
        max_vehicles: 25,
        subscription_ends_at: "2027-05-24T00:00:00.000Z",
        grace_until: null,
        trial_ends_at: null,
        finance_enabled: true,
        ai_enabled: false,
        reports_enabled: true,
        driver_scoring_enabled: true,
        anomaly_insights_enabled: false,
        geofencing_enabled: false,
        scheduled_reports_enabled: false,
        offline_driver_enabled: false,
      }),
    });
  });

  (page as Page & {
    __billingDebug?: {
      billingRpcCalls: string[];
      consoleErrors: string[];
      requestFailures: string[];
    };
  }).__billingDebug = { billingRpcCalls, consoleErrors, requestFailures };
}

async function dumpBillingPageState(page: Page): Promise<void> {
  const debug = (page as Page & {
    __billingDebug?: {
      billingRpcCalls: string[];
      consoleErrors: string[];
      requestFailures: string[];
    };
  }).__billingDebug;
  try {
    const state = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      mockAuth: window.localStorage.getItem("esamba-mock-auth-v1"),
      demoFallback: window.localStorage.getItem("esamba-demo-auth-fallback"),
      activeFleet: window.localStorage.getItem("esamba.active_fleet_id"),
      bodyText: document.body.innerText.replace(/\s+/g, " ").slice(0, 1200),
    }));

    console.log("[billing-e2e-debug]", JSON.stringify({
      ...state,
      billingRpcCalls: debug?.billingRpcCalls ?? [],
      requestFailures: debug?.requestFailures ?? [],
      consoleErrors: debug?.consoleErrors ?? [],
    }, null, 2));
  } catch (error) {
    console.log("[billing-e2e-debug-unavailable]", error instanceof Error ? error.message : String(error));
  }
}

test.describe("BillingPage e2e", () => {
  test("affiche le contexte facturation et le badge Actif", async ({ page }) => {
    await enableMockAuthSession(page);
    await mockSupabaseForBilling(page);

    await page.goto("/dashboard/billing", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await activateMockAuthSession(page);
    await page.goto("/dashboard/billing", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector("main", { state: "attached", timeout: 15_000 });

    const heading = page.getByRole("heading", { name: /Abonnement & Facturation/i });
    try {
      await expect(heading).toBeVisible({ timeout: 10_000 });
    } catch (error) {
      await dumpBillingPageState(page);
      throw error;
    }
    await expect(page.getByText("Actif", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Starter")).toBeVisible();
  });
});
