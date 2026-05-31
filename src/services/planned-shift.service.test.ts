import { describe, expect, it, vi } from "vitest";
import { PlannedShiftService } from "@/services/planned-shift.service";
import type { PlannedShiftRepository } from "@/repositories/planned-shift.repository";
import type { PlannedShift } from "@/repositories/planned-shift.repository";

const basePlanned: PlannedShift = {
  id: "plan-1",
  fleet_id: "fleet-1",
  driver_user_id: "driver-1",
  vehicle_id: "vehicle-1",
  planned_start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  planned_end: null,
  status: "confirmed",
  creneau_id: null,
  notes: null,
  created_by: "mgr-1",
  created_at: new Date().toISOString(),
};

function makeService(repo: Partial<PlannedShiftRepository>) {
  return new PlannedShiftService(repo as PlannedShiftRepository);
}

describe("PlannedShiftService.createPlannedShift", () => {
  it("crée un créneau planifié validé", async () => {
    const create = vi.fn().mockResolvedValue(basePlanned);
    const service = makeService({ create });

    const result = await service.createPlannedShift(
      {
        fleet_id: "fleet-1",
        driver_user_id: "driver-1",
        vehicle_id: "vehicle-1",
        planned_start: basePlanned.planned_start,
      },
      "mgr-1",
    );

    expect(create).toHaveBeenCalled();
    expect(result.id).toBe("plan-1");
  });

  it("rejette une date trop ancienne", async () => {
    const service = makeService({ create: vi.fn() });

    await expect(
      service.createPlannedShift(
        {
          fleet_id: "fleet-1",
          driver_user_id: "driver-1",
          vehicle_id: "vehicle-1",
          planned_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        "mgr-1",
      ),
    ).rejects.toThrow(/passé/i);
  });
});

describe("PlannedShiftService.linkOnShiftStart", () => {
  it("lie le créneau planifié dans la fenêtre horaire", async () => {
    const planned = {
      ...basePlanned,
      planned_start: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    };
    const linkToCreneau = vi.fn().mockResolvedValue(undefined);
    const service = makeService({
      findUpcomingForDriver: vi.fn().mockResolvedValue(planned),
      linkToCreneau,
    });

    await service.linkOnShiftStart("driver-1", "creneau-1");

    expect(linkToCreneau).toHaveBeenCalledWith("plan-1", "creneau-1");
  });

  it("ne lie rien sans créneau planifié", async () => {
    const linkToCreneau = vi.fn();
    const service = makeService({
      findUpcomingForDriver: vi.fn().mockResolvedValue(null),
      linkToCreneau,
    });

    await service.linkOnShiftStart("driver-1", "creneau-1");

    expect(linkToCreneau).not.toHaveBeenCalled();
  });
});

describe("PlannedShiftService.cancelPlannedShift", () => {
  it("exige un identifiant", async () => {
    const service = makeService({ cancel: vi.fn() });

    await expect(service.cancelPlannedShift("")).rejects.toThrow(/requis/i);
  });
});
