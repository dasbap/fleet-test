import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OperationsRepository } from "@/repositories/operations.repository";
import { DriverShiftRepository } from "@/repositories/driver-shift.repository";
import { VehicleRepository } from "@/repositories/vehicle.repository";
import { DvirRepository } from "@/repositories/dvir.repository";

describe("OperationsRepository.fetchDriverDay", () => {
  const repo = new OperationsRepository();
  let shiftSpy: ReturnType<typeof vi.spyOn>;
  let vehicleByIdSpy: ReturnType<typeof vi.spyOn>;
  let assignmentSpy: ReturnType<typeof vi.spyOn>;
  let dvirListSpy: ReturnType<typeof vi.spyOn>;
  let closureSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    shiftSpy = vi.spyOn(DriverShiftRepository.prototype, "findActiveShiftByDriverId");
    vehicleByIdSpy = vi.spyOn(VehicleRepository.prototype, "findById");
    assignmentSpy = vi.spyOn(
      VehicleRepository.prototype,
      "findActiveAssignmentVehicleForDriver",
    );
    dvirListSpy = vi.spyOn(DvirRepository.prototype, "getList").mockResolvedValue([]);
    closureSpy = vi
      .spyOn(DriverShiftRepository.prototype, "findClosureByShiftId")
      .mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retourne un créneau en cours quand un shift actif existe", async () => {
    shiftSpy.mockResolvedValue({
      id: "shift-1",
      assignment_id: "assign-1",
      km_start: 12_000,
      km_end: null,
      started_at: "2026-05-31T06:00:00.000Z",
      ended_at: null,
      status: "open",
      assignment: {
        id: "assign-1",
        fleet_id: "fleet-1",
        vehicle_id: "veh-1",
        driver_user_id: "user-1",
        vehicle: {
          id: "veh-1",
          registration: "LT-001-AA",
          brand: "Toyota",
          model: "Hilux",
        },
      },
    });
    vehicleByIdSpy.mockResolvedValue({
      id: "veh-1",
      fleet_id: "fleet-1",
      registration: "LT-001-AA",
      brand: "Toyota",
      model: "Hilux",
      current_km: 12_050,
      status: "ok",
      year: null,
      blocked_reason: null,
      created_at: "",
      updated_at: "",
    });

    const day = await repo.fetchDriverDay("user-1");

    expect(day.missionStatus).toBe("in_progress");
    expect(day.missionTitle).toBe("Créneau en cours");
    expect(day.vehiclePlate).toBe("LT-001-AA");
    expect(day.activeShiftId).toBe("shift-1");
    expect(dvirListSpy).toHaveBeenCalled();
    expect(closureSpy).toHaveBeenCalledWith("shift-1");
    expect(assignmentSpy).not.toHaveBeenCalled();
  });

  it("retourne l'affectation véhicule sans créneau ouvert", async () => {
    shiftSpy.mockResolvedValue(null);
    assignmentSpy.mockResolvedValue({
      assignmentId: "assign-1",
      fleetId: "fleet-1",
      vehicle: {
        id: "veh-1",
        registration: "LT-002-BB",
        brand: "Isuzu",
        model: "NPR",
        current_km: 8_400,
      },
    });

    const day = await repo.fetchDriverDay("user-1");

    expect(day.missionStatus).toBe("planned");
    expect(day.missionTitle).toBe("Aucun créneau ouvert");
    expect(day.vehiclePlate).toBe("LT-002-BB");
    expect(day.vehicleKm).toContain("8");
    expect(assignmentSpy).toHaveBeenCalledWith("user-1");
  });

  it("retourne un état vide sans affectation ni créneau", async () => {
    shiftSpy.mockResolvedValue(null);
    assignmentSpy.mockResolvedValue(null);

    const day = await repo.fetchDriverDay("user-1");

    expect(day.missionTitle).toBe("Aucune mission assignée");
    expect(day.vehiclePlate).toBe("—");
  });
});
