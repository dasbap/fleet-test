import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const inboundWebhookSource = () =>
  readFileSync("src/server/domain/billing/processInboundPaymentWebhook.ts", "utf8");

const edgeWebhookSource = () =>
  readFileSync("supabase/functions/notch-pay-webhook/index.ts", "utf8");

const esambaWebSubscriptionCreateSource = () =>
  readFileSync("apps/esamba-web/src/app/api/subscriptions/create/route.ts", "utf8");

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

  it("keeps existing same-plan subscriptions aligned when a payment extends them", () => {
    expect(inboundWebhookSource()).toContain(
      "vehicle_slots: resolveRenewedVehicleSlots({",
    );
    expect(edgeWebhookSource()).toContain(
      "vehicle_slots: resolveRenewedVehicleSlots(activeSub.vehicle_slots, vehicleCount, plan.max_vehicles)",
    );
  });
});
