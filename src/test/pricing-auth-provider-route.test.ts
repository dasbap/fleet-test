import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("pricing auth-aware route", () => {
  it("keeps /pricing inside AuthProviderLayout so the public navbar can show Dashboard", () => {
    const routes = readFileSync("src/app/routes/app.routes.tsx", "utf8");
    const authProviderIndex = routes.indexOf('<Route element={<AuthProviderLayout />}>');
    const pricingRouteIndex = routes.indexOf('<Route path="/pricing" element={<PricingPage />} />');

    expect(authProviderIndex).toBeGreaterThanOrEqual(0);
    expect(pricingRouteIndex).toBeGreaterThan(authProviderIndex);
  });
});
