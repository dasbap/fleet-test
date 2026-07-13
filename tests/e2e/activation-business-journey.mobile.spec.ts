import { expect, test } from "@playwright/test";

import {
  openDashboard,
  seedActivationState,
  setupActivationMocks,
  visitBusinessStep,
} from "./activation-business-journey.helpers";

test.describe("Activation journey E2E (mobile)", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(60_000);

  test("mobile: valide un parcours réduit adapté au shell mobile", async ({
    page,
  }) => {
    const state = seedActivationState();
    await setupActivationMocks(page, state);

    await openDashboard(page);
    await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);

    state.progress = { step: 3, completed: false };
    await openDashboard(page);
    await expect(page).toHaveURL(/\/dashboard(\/.*)?$/);

    await visitBusinessStep(page, "/dashboard/alerts");
  });
});
