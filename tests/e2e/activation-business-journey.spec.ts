import { expect, test, type Page } from "@playwright/test";

type MockOnboardingProgress = {
  step: 1 | 2 | 3 | 4;
  completed: boolean;
};

type JourneyState = { progress: MockOnboardingProgress };

function seedActivationState(): JourneyState {
  return { progress: { step: 1, completed: false } };
}

async function enableMockAuthSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const nowIso = new Date().toISOString();

    window.localStorage.setItem("esamba-demo-auth-fallback", "true");
    window.localStorage.setItem(
      "esamba-mock-auth-v1",
      JSON.stringify({
        user: {
          id: "mock-e2e-user",
          email: "organizer@esamba.test",
          created_at: nowIso,
          user_metadata: { full_name: "E2E Organizer" },
        },
        role: "organizer",
        memberships: [
          {
            id: "mock-membership-e2e",
            fleet_id: "fleet-esamba-sn",
            role: "organizer",
            is_active: true,
          },
        ],
      }),
    );
  });
}

function mockSupabaseForActivationJourney(page: Page, state: JourneyState): Promise<void> {
  return page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    if (method === "GET" && url.includes("/rest/v1/flottes")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "fleet-esamba-sn",
            name: "E-Samba Transport & Logistique",
            organisations: {
              id: "mock-org",
              country_code: "SN",
            },
          },
        ]),
      });
      return;
    }

    if (method === "GET" && url.includes("/rest/v1/onboarding_progress")) {
      const body = {
        id: "onboarding-e2e",
        org_id: "mock-org",
        user_id: "mock-e2e-user",
        step: state.progress.step,
        completed: state.progress.completed,
        data: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });
}

async function openDashboard(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);
}

async function visitBusinessStep(page: Page, routePath: string): Promise<void> {
  await page.goto(routePath);
  await expect(page).toHaveURL(new RegExp(routePath.replace("/", "\\/")));
}

async function setupActivationMocks(page: Page, state: JourneyState): Promise<void> {
  await enableMockAuthSession(page);
  await mockSupabaseForActivationJourney(page, state);
}

test.describe("Activation journey E2E (parcours métier complet)", () => {
  test.describe.configure({ mode: "serial" });

  test.describe("desktop", () => {
    test.skip(({ isMobile }) => isMobile, "Ce scénario complet est réservé au shell desktop.");

    test("desktop: valide le parcours métier complet", async ({ page }) => {
    test.slow();
    const state = seedActivationState();
    await setupActivationMocks(page, state);

    await openDashboard(page);

    // 1) 1er véhicule
    state.progress = { step: 2, completed: false };
    await visitBusinessStep(page, "/dashboard/vehicles");

    // 2) 1er créneau
    state.progress = { step: 3, completed: false };
    await visitBusinessStep(page, "/dashboard/closure");

    // 3) 1ère alerte
    state.progress = { step: 4, completed: false };
    await visitBusinessStep(page, "/dashboard/alerts");

    // 4) consultation rapport
    await visitBusinessStep(page, "/dashboard/reports");

    // 5) ajout membre + completion
    state.progress = { step: 4, completed: true };
    await visitBusinessStep(page, "/dashboard/teams");
  });
  });

  test.describe("mobile", () => {
    test.skip(({ isMobile }) => !isMobile, "Ce scénario réduit est réservé au shell mobile.");
    test.setTimeout(60_000);

    test("mobile: valide un parcours réduit adapté au shell mobile", async ({ page }) => {
      const state = seedActivationState();
      await setupActivationMocks(page, state);

      await openDashboard(page);
      await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);

      state.progress = { step: 3, completed: false };
      await openDashboard(page);
      await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);

      await page.goto("/dashboard/alerts");
      await expect(page).toHaveURL(/\/dashboard\/alerts$/);
    });
  });
});
