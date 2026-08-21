import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const inboundWebhookSource = () =>
  readFileSync("src/server/domain/billing/processInboundPaymentWebhook.ts", "utf8");

const edgeWebhookSource = () =>
  readFileSync("supabase/functions/notch-pay-webhook/index.ts", "utf8");

const esambaWebSubscriptionCreateSource = () =>
  readFileSync("apps/esamba-web/src/app/api/subscriptions/create/route.ts", "utf8");

const esambaWebNotchInitiateSource = () =>
  readFileSync("apps/esamba-web/src/app/api/payments/notchpay/initiate/route.ts", "utf8");

const esambaWebFapshiInitiateSource = () =>
  readFileSync("apps/esamba-web/src/app/api/payments/fapshi/initiate/route.ts", "utf8");

const subscriptionLifecycleSource = () =>
  readFileSync("src/server/domain/billing/subscriptionLifecycle.ts", "utf8");

const testYaoundeSeedSource = () =>
  readFileSync("scripts/apply-test-yaounde-seed.mjs", "utf8");

const upgradePageSource = () =>
  readFileSync("src/pages/Upgrade.tsx", "utf8");

describe("subscription vehicle slots runtime paths", () => {
  it("persists purchased vehicleCount into vehicle_slots from all subscription creation paths", () => {
    expect(inboundWebhookSource()).toContain("vehicle_slots: Math.max(1, vehicleCount)");
    expect(edgeWebhookSource()).toContain("vehicle_slots: Math.max(1, vehicleCount)");
      expect(esambaWebSubscriptionCreateSource()).toContain("vehicle_slots: vehicleCount");
      expect(subscriptionLifecycleSource()).toContain("vehicle_slots: Math.max(1, plan.max_vehicles ?? 1)");
      expect(testYaoundeSeedSource()).toContain("vehicle_slots: TEST_VEHICLES.length");
      expect(upgradePageSource()).toContain("selectedVehicleCounts[plan.key]");
      expect(upgradePageSource()).not.toContain("const vehicleCount = DEFAULT_VEHICLE_COUNTS[plan.key]");
    });

  it("does not offer the free plan from the upgrade page", () => {
    const source = upgradePageSource();

    expect(source).not.toContain('type PlanKey = "free"');
    expect(source).not.toContain('key: "free"');
    expect(source).not.toContain("Demander le gratuit");
    expect(source).not.toContain("PUBLIC_PRICE_FREE_PER_VEHICLE_XAF");
  });

  it("keeps existing same-plan subscriptions aligned when a payment extends them", () => {
    expect(inboundWebhookSource()).toContain(
      "vehicle_slots: resolveRenewedVehicleSlots({",
    );
    expect(edgeWebhookSource()).toContain(
      "vehicle_slots: resolveRenewedVehicleSlots(activeSub.vehicle_slots, vehicleCount, plan.max_vehicles)",
    );
  });

  it("bounds legacy Next pending subscriptions to the selected plan vehicle limit", () => {
    const source = esambaWebSubscriptionCreateSource();

    expect(source).toContain("max_vehicles");
    expect(source).toContain("body.vehicleCount == null");
    expect(source).toContain("vehicleCount > plan.max_vehicles");
    expect(source).not.toContain("Math.max(body.vehicleCount ?? 1, 1)");
  });

  it("bills legacy Next payment initiation from persisted subscription slots", () => {
    for (const source of [esambaWebNotchInitiateSource(), esambaWebFapshiInitiateSource()]) {
      expect(source).toContain("vehicle_slots");
      expect(source).toContain("subscription.vehicle_slots");
      expect(source).toContain("vehicleCount !== subscription.vehicle_slots");
      expect(source).not.toContain("Math.max(body.vehicleCount ?? 1, 1)");
    }
  });

  it("binds legacy Next payment initiation to the persisted subscription plan", () => {
    for (const source of [esambaWebNotchInitiateSource(), esambaWebFapshiInitiateSource()]) {
      expect(source).toContain("plan_id");
      expect(source).toContain(".eq(\"id\", subscription.plan_id)");
      expect(source).toContain("plan.code !== body.planCode.trim()");
      expect(source).toContain("p_plan_code: plan.code");
      expect(source).not.toContain(".eq(\"code\", body.planCode.trim())");
    }
  });
});
