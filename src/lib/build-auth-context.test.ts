import { describe, expect, it } from "vitest";
import { buildAuthContext } from "@/lib/build-auth-context";
import type { BillingSnapshot } from "@/services/billing.service";
import type { FleetBillingContext } from "@/types/fleet-billing";

const user = {
  id: "u1",
  email: "a@b.c",
  user_metadata: { full_name: "Test User" },
};

const fbPro: FleetBillingContext = {
  planCode: "pro",
  isPaid: true,
  vehicleCount: 1,
  maxVehicles: 999_999,
  financeEnabled: true,
  aiEnabled: true,
  reportsEnabled: true,
  driverScoringEnabled: true,
  anomalyInsightsEnabled: true,
};

describe("buildAuthContext", () => {
  it("agrège nom, plan et max_vehicles illimité", () => {
    const billing: BillingSnapshot = {
      lapsedPaid: false,
      subscription: {
        id: "s1",
        status: "active",
        startsAt: "2026-01-01",
        endsAt: "2027-01-01",
        plan: { id: "p1", code: "pro", name: "Pro", pricePerVehicle: 10 },
      },
      recentPayments: [],
    };
    const ctx = buildAuthContext({
      user,
      activeRole: "manager",
      orgId: "o1",
      fleetId: "f1",
      fleetName: "Flotte A",
      fleetBilling: fbPro,
      billing,
    });
    expect(ctx.full_name).toBe("Test User");
    expect(ctx.plan_code).toBe("pro");
    expect(ctx.max_vehicles).toBeNull();
    expect(ctx.role).toBe("manager");
    expect(ctx.plan_expired).toBe(false);
  });
});
