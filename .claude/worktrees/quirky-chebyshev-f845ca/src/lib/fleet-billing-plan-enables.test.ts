import { describe, expect, it } from "vitest";
import {
  fleetBillingMaxVehiclesOrNull,
  fleetBillingToPlanEnables,
  toPlanCode,
  UNLIMITED_VEHICLES_THRESHOLD,
} from "@/lib/fleet-billing-plan-enables";
import type { FleetBillingContext } from "@/types/fleet-billing";

const sample: FleetBillingContext = {
  planCode: "pro",
  isPaid: true,
  vehicleCount: 2,
  maxVehicles: 10,
  financeEnabled: true,
  aiEnabled: true,
  reportsEnabled: true,
  driverScoringEnabled: true,
  anomalyInsightsEnabled: false,
};

describe("fleetBillingToPlanEnables", () => {
  it("mappe les drapeaux camelCase vers PlanEnables", () => {
    expect(fleetBillingToPlanEnables(sample)).toEqual({
      finance: true,
      ai: true,
      reports: true,
      driver_scoring: true,
      anomaly_insights: false,
    });
  });
});

describe("fleetBillingMaxVehiclesOrNull", () => {
  it("retourne null si plafond « illimité »", () => {
    expect(fleetBillingMaxVehiclesOrNull(UNLIMITED_VEHICLES_THRESHOLD)).toBeNull();
    expect(fleetBillingMaxVehiclesOrNull(UNLIMITED_VEHICLES_THRESHOLD + 1)).toBeNull();
  });

  it("retourne le nombre sinon", () => {
    expect(fleetBillingMaxVehiclesOrNull(3)).toBe(3);
  });
});

describe("toPlanCode", () => {
  it("accepte les codes connus", () => {
    expect(toPlanCode("free")).toBe("free");
    expect(toPlanCode("organizer")).toBe("organizer");
  });

  it("retombe sur free si inconnu", () => {
    expect(toPlanCode("unknown")).toBe("free");
  });
});
