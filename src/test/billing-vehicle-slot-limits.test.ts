/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  assertVehicleCountWithinPlanLimit,
  resolveRenewedVehicleSlots,
} from "@/server/domain/billing/vehicleSlotLimits";

describe("billing vehicle slot limits", () => {
  it("refuse a purchase above the plan vehicle limit", () => {
    expect(() =>
      assertVehicleCountWithinPlanLimit({
        planCode: "starter",
        requestedVehicleCount: 26,
        planMaxVehicles: 25,
      }),
    ).toThrow(/limite.*25/i);
  });

  it("keeps renewal slots within the plan vehicle limit", () => {
    expect(
      resolveRenewedVehicleSlots({
        currentVehicleSlots: 24,
        requestedVehicleCount: 25,
        planMaxVehicles: 25,
      }),
    ).toBe(25);

    expect(() =>
      resolveRenewedVehicleSlots({
        currentVehicleSlots: 25,
        requestedVehicleCount: 26,
        planMaxVehicles: 25,
      }),
    ).toThrow(/limite.*25/i);
  });
});
