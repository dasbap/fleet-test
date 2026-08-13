import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("subscription dashboard module", () => {
  it("has its own route instead of loading management RPCs inside billing", () => {
    const routes = readFileSync("src/app/routes/dashboard.routes.tsx", "utf8");
    const billingPage = readFileSync("src/features/billing/screens/BillingPage.tsx", "utf8");
    const subscriptionsPage = readFileSync(
      "src/features/billing/screens/SubscriptionsPage.tsx",
      "utf8",
    );

    expect(routes).toContain('path="subscriptions"');
    expect(routes).toContain("SubscriptionsPage");
    expect(billingPage).not.toContain("SubscriptionManagementPanel");
    expect(subscriptionsPage).toContain("SubscriptionManagementPanel");
  });
});
