import { expect, type Page } from "@playwright/test";

type MockOnboardingProgress = {
  step: 1 | 2 | 3 | 4;
  completed: boolean;
};

export type JourneyState = { progress: MockOnboardingProgress };

export function seedActivationState(): JourneyState {
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
            fleet_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            role: "organizer",
            is_active: true,
          },
        ],
      })
    );
  });
}

async function mockSupabaseForActivationJourney(
  page: Page,
  state: JourneyState
): Promise<void> {
  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    if (method === "GET" && url.includes("/rest/v1/flottes")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
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

export async function openDashboard(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);
}

export async function visitBusinessStep(
  page: Page,
  routePath: string
): Promise<void> {
  await page.goto(routePath);
  await expect(page).toHaveURL(new RegExp(routePath.replace("/", "\\/")));
}

export async function setupActivationMocks(
  page: Page,
  state: JourneyState
): Promise<void> {
  await enableMockAuthSession(page);
  await mockSupabaseForActivationJourney(page, state);
}
