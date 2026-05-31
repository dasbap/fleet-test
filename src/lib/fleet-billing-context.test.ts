import { describe, expect, it } from "vitest";
import { normalizeFleetBillingContext } from "./fleet-billing-context";

describe("normalizeFleetBillingContext", () => {
  it("normalise la réponse RPC snake_case", () => {
    const ctx = normalizeFleetBillingContext({
      plan_code: "free",
      is_paid: false,
      vehicle_count: 2,
      max_vehicles: 3,
      finance_enabled: false,
      ai_enabled: false,
      reports_enabled: false,
      driver_scoring_enabled: false,
      anomaly_insights_enabled: false,
    });
    expect(ctx.planCode).toBe("free");
    expect(ctx.vehicleCount).toBe(2);
    expect(ctx.maxVehicles).toBe(3);
    expect(ctx.financeEnabled).toBe(false);
    expect(ctx.aiEnabled).toBe(false);
    expect(ctx.reportsEnabled).toBe(false);
    expect(ctx.driverScoringEnabled).toBe(false);
    expect(ctx.anomalyInsightsEnabled).toBe(false);
  });

  it("RPC hérité sans clés pour plan payant : fonctionnalités ouvertes", () => {
    const ctx = normalizeFleetBillingContext({
      plan_code: "pro",
      is_paid: true,
      vehicle_count: 1,
      max_vehicles: 999999,
      finance_enabled: true,
      ai_enabled: true,
    });
    expect(ctx.reportsEnabled).toBe(true);
    expect(ctx.driverScoringEnabled).toBe(true);
    expect(ctx.anomalyInsightsEnabled).toBe(true);
  });

  it("RPC hérité sans clés pour plan free : verrous alignés (sans migration des colonnes)", () => {
    const ctx = normalizeFleetBillingContext({
      plan_code: "free",
      is_paid: false,
      vehicle_count: 2,
      max_vehicles: 3,
      finance_enabled: false,
      ai_enabled: false,
    });
    expect(ctx.reportsEnabled).toBe(false);
    expect(ctx.driverScoringEnabled).toBe(false);
    expect(ctx.anomalyInsightsEnabled).toBe(false);
  });

  it("mappe grace_period vers grace et expose les dates lifecycle", () => {
    const ctx = normalizeFleetBillingContext({
      plan_code: "starter",
      plan_name: "Starter",
      is_paid: true,
      billing_status: "grace_period",
      vehicle_count: 4,
      active_vehicles: 3,
      max_vehicles: 25,
      vehicle_slots: 25,
      subscription_ends_at: "2026-05-01T00:00:00.000Z",
      grace_until: "2026-05-08T00:00:00.000Z",
    });
    expect(ctx.billingStatus).toBe("grace");
    expect(ctx.planName).toBe("Starter");
    expect(ctx.graceUntil).toBe("2026-05-08T00:00:00.000Z");
    expect(ctx.vehicleSlots).toBe(25);
  });

  it("fallback vehicle_slots depuis max_vehicles si absent", () => {
    const ctx = normalizeFleetBillingContext({
      plan_code: "pro",
      is_paid: true,
      vehicle_count: 5,
      max_vehicles: 25,
    });
    expect(ctx.vehicleSlots).toBe(25);
    expect(ctx.maxVehicles).toBe(25);
  });

  it("fallback plan_name depuis plan_code", () => {
    const ctx = normalizeFleetBillingContext({
      plan_code: "pro",
      is_paid: true,
      max_vehicles: 25,
    });
    expect(ctx.planName).toBe("Pro");
  });
});
