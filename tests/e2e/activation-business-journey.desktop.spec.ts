import { test } from "@playwright/test";

import {
  openDashboard,
  seedActivationState,
  setupActivationMocks,
  visitBusinessStep,
} from "./activation-business-journey.helpers";

test.describe("Activation journey E2E (desktop)", () => {
  test.describe.configure({ mode: "serial" });

  test("desktop: valide le parcours métier complet", async ({ page }) => {
    test.slow();
    const state = seedActivationState();
    await setupActivationMocks(page, state);

    await openDashboard(page);

    state.progress = { step: 2, completed: false };
    await visitBusinessStep(page, "/dashboard/vehicles");

    state.progress = { step: 3, completed: false };
    await visitBusinessStep(page, "/dashboard/closure");

    state.progress = { step: 4, completed: false };
    await visitBusinessStep(page, "/dashboard/alerts");

    await visitBusinessStep(page, "/dashboard/reports");

    state.progress = { step: 4, completed: true };
    await visitBusinessStep(page, "/dashboard/teams");
  });
});
