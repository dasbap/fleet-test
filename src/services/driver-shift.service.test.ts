import { describe, expect, it, vi } from "vitest";
import { DriverShiftService } from "@/services/driver-shift.service";
import type { DriverShiftRepository } from "@/repositories/driver-shift.repository";
import type { VehicleRepository } from "@/repositories/vehicle.repository";
import type { DriverShift } from "@/repositories/driver-shift.repository";

const openShift: DriverShift = {
  id: "shift-1",
  assignment_id: "assign-1",
  km_start: 1000,
  km_end: null,
  started_at: "2026-05-31T08:00:00.000Z",
  ended_at: null,
  status: "open",
};

function makeService(
  shiftRepo: Partial<DriverShiftRepository>,
  vehicleRepo: Partial<VehicleRepository> = {},
) {
  return new DriverShiftService(
    shiftRepo as DriverShiftRepository,
    vehicleRepo as VehicleRepository,
  );
}

describe("DriverShiftService.startShift", () => {
  it("crée un créneau avec un payload validé", async () => {
    const create = vi.fn().mockResolvedValue(openShift);
    const service = makeService({ create });

    const result = await service.startShift({
      assignment_id: "assign-1",
      km_start: 1000,
    });

    expect(create).toHaveBeenCalledWith({
      assignment_id: "assign-1",
      km_start: 1000,
    });
    expect(result).toBe(openShift);
  });

  it("rejette un km_start négatif", async () => {
    const service = makeService({ create: vi.fn() });

    await expect(
      service.startShift({ assignment_id: "assign-1", km_start: -1 }),
    ).rejects.toThrow(/négatif/i);
  });
});

describe("DriverShiftService.closeShift", () => {
  const closure = {
    shift_id: "shift-1",
    km_end: 1100,
    revenue_declared: 10000,
    collection_mode: "cash" as const,
    proof_type: "photo",
    proof_value: "proof-1",
  };

  it("ferme un créneau ouvert et met à jour le kilométrage véhicule", async () => {
    const closeShift = vi.fn().mockResolvedValue(undefined);
    const calculateExpectedRevenue = vi.fn().mockResolvedValue(undefined);
    const getVehicleIdByShiftId = vi.fn().mockResolvedValue("vehicle-1");
    const updateKilometerage = vi.fn().mockResolvedValue(undefined);
    const service = makeService(
      {
        findById: vi.fn().mockResolvedValue(openShift),
        closeShift,
        calculateExpectedRevenue,
        getVehicleIdByShiftId,
      },
      { updateKilometerage },
    );

    await service.closeShift(closure);

    expect(closeShift).toHaveBeenCalledWith(closure);
    expect(calculateExpectedRevenue).toHaveBeenCalledWith("shift-1");
    expect(updateKilometerage).toHaveBeenCalledWith("vehicle-1", 1100);
  });

  it("rejette si le créneau est introuvable", async () => {
    const service = makeService({ findById: vi.fn().mockResolvedValue(null) });

    await expect(service.closeShift(closure)).rejects.toThrow(/introuvable/i);
  });

  it("rejette si le créneau est déjà fermé", async () => {
    const service = makeService({
      findById: vi.fn().mockResolvedValue({ ...openShift, status: "closed" }),
    });

    await expect(service.closeShift(closure)).rejects.toThrow(/déjà fermé/i);
  });

  it("rejette si km_end est inférieur à km_start", async () => {
    const service = makeService({ findById: vi.fn().mockResolvedValue(openShift) });

    await expect(
      service.closeShift({ ...closure, km_end: 900 }),
    ).rejects.toThrow(/inférieur/i);
  });

  it("réussit même si la mise à jour km véhicule échoue (RLS conducteur)", async () => {
    const closeShift = vi.fn().mockResolvedValue(undefined);
    const calculateExpectedRevenue = vi.fn().mockResolvedValue(undefined);
    const getVehicleIdByShiftId = vi.fn().mockResolvedValue("vehicle-1");
    const updateKilometerage = vi.fn().mockRejectedValue(new Error("Cannot coerce the result to a single JSON object"));
    const service = makeService(
      {
        findById: vi.fn().mockResolvedValue(openShift),
        closeShift,
        calculateExpectedRevenue,
        getVehicleIdByShiftId,
      },
      { updateKilometerage },
    );

    await expect(service.closeShift(closure)).resolves.toBeUndefined();
    expect(closeShift).toHaveBeenCalled();
  });
});

describe("DriverShiftService.buildOfflineShiftStartPayload", () => {
  it("construit le payload offline", () => {
    const service = makeService({});

    expect(
      service.buildOfflineShiftStartPayload({
        assignment_id: "assign-1",
        km_start: 500,
      }),
    ).toEqual({ assignmentId: "assign-1", kmStart: 500 });
  });

  it("exige assignment_id", () => {
    const service = makeService({});

    expect(() =>
      service.buildOfflineShiftStartPayload({ assignment_id: "", km_start: 0 }),
    ).toThrow(/affectation/i);
  });
});

describe("DriverShiftService.buildOfflineShiftClosePayload", () => {
  it("construit le payload offline", () => {
    const service = makeService({});

    expect(
      service.buildOfflineShiftClosePayload({
        shift_id: "shift-1",
        km_end: 1100,
        revenue_declared: 5000,
        collection_mode: "momo",
        proof_type: "momo_ref",
        proof_value: "REF-1",
      }),
    ).toEqual({
      shiftId: "shift-1",
      kmEnd: 1100,
      revenueDeclared: 5000,
      collectionMode: "momo",
      proofType: "momo_ref",
      proofValue: "REF-1",
    });
  });

  it("exige shift_id et preuve", () => {
    const service = makeService({});

    expect(() =>
      service.buildOfflineShiftClosePayload({
        shift_id: "",
        km_end: 100,
        revenue_declared: 0,
        collection_mode: "cash",
        proof_type: "",
        proof_value: "",
      }),
    ).toThrow();
  });
});
