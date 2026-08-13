import { describe, expect, it } from "vitest";

import { getVehicleSubscriptionAccess } from "@/lib/billing/vehicleSubscriptionAccess";
import type { SubscriptionSummary } from "@/services/subscription-management.service";

function makeSubscription(
  overrides: Partial<SubscriptionSummary> & Pick<SubscriptionSummary, "id" | "planCode">,
): SubscriptionSummary {
  return {
    id: overrides.id,
    fleetId: "fleet-1",
    fleetName: "Flotte tuto",
    planId: `${overrides.planCode}-plan`,
    planCode: overrides.planCode,
    planName: overrides.planCode === "pro" ? "Pro" : "Starter",
    status: "active",
    startsAt: "2026-08-11T00:00:00Z",
    endsAt: "2026-12-11T00:00:00Z",
    cancelledAt: null,
    vehicleSlots: 1,
    vehicleCapacity: 1,
    vehicleCount: overrides.vehicles?.length ?? 0,
    availableSlots: 0,
    vehicles: overrides.vehicles ?? [],
    financeEnabled: overrides.financeEnabled ?? true,
    aiEnabled: overrides.aiEnabled ?? false,
    reportsEnabled: overrides.reportsEnabled ?? true,
    driverScoringEnabled: overrides.driverScoringEnabled ?? true,
    anomalyInsightsEnabled: overrides.anomalyInsightsEnabled ?? false,
    geofencingEnabled: overrides.geofencingEnabled ?? false,
    scheduledReportsEnabled: overrides.scheduledReportsEnabled ?? false,
    offlineDriverEnabled: overrides.offlineDriverEnabled ?? true,
    ...overrides,
  };
}

describe("getVehicleSubscriptionAccess", () => {
  it("uses the subscription attached to the vehicle, not the best plan of the fleet", () => {
    const subscriptions = [
      makeSubscription({
        id: "starter-sub",
        planCode: "starter",
        aiEnabled: false,
        vehicles: [{ id: "vehicle-starter", fleetId: "fleet-1", registration: "STA-001", status: "active", fleetName: "Flotte tuto", associatedAt: null }],
      }),
      makeSubscription({
        id: "pro-sub",
        planCode: "pro",
        aiEnabled: true,
        anomalyInsightsEnabled: true,
        geofencingEnabled: true,
        scheduledReportsEnabled: true,
        vehicles: [{ id: "vehicle-pro", fleetId: "fleet-1", registration: "PRO-001", status: "active", fleetName: "Flotte tuto", associatedAt: null }],
      }),
    ];

    expect(getVehicleSubscriptionAccess(subscriptions, "vehicle-pro").access.pulse.allowed).toBe(true);
    expect(getVehicleSubscriptionAccess(subscriptions, "vehicle-starter").access.pulse.allowed).toBe(false);
  });

  it("blocks premium features when the vehicle is not linked to an active subscription", () => {
    const access = getVehicleSubscriptionAccess([], "vehicle-free");

    expect(access.isCovered).toBe(false);
    expect(access.access.finance.allowed).toBe(false);
    expect(access.access.pulse.allowed).toBe(false);
  });
});
