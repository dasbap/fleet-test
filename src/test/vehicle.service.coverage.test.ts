import { beforeEach, describe, expect, it, vi } from "vitest";
import { VehicleService } from "@/services/vehicle.service";
import type { VehicleRepository } from "@/repositories/vehicle.repository";

function createRepositoryMock() {
  return {
    findAllWithAssignments: vi.fn(),
    findListItems: vi.fn(),
    findAllSimple: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    findByIdWithAssignment: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateKilometerage: vi.fn(),
    delete: vi.fn(),
  };
}

describe("VehicleService additional guard coverage", () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let service: VehicleService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new VehicleService(repository as unknown as VehicleRepository);
  });

  it("delegates simple vehicle listing with the optional fleet", async () => {
    const vehicles = [{ id: "vehicle-1" }];
    repository.findAllSimple.mockResolvedValue(vehicles);

    await expect(service.getVehiclesSimple("fleet-1")).resolves.toEqual(vehicles);
    expect(repository.findAllSimple).toHaveBeenCalledWith("fleet-1");
  });

  it("delegates filtered all-vehicle listing", async () => {
    const filters = { fleet_id: "fleet-1" };
    repository.findAll.mockResolvedValue([]);

    await expect(service.getAllVehicles(filters)).resolves.toEqual([]);
    expect(repository.findAll).toHaveBeenCalledWith(filters);
  });

  it("rejects getVehicleById without an id", async () => {
    await expect(service.getVehicleById("")).rejects.toThrow("L'ID du véhicule est requis");
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it("delegates getVehicleById for a valid id", async () => {
    const vehicle = { id: "vehicle-1" };
    repository.findById.mockResolvedValue(vehicle);

    await expect(service.getVehicleById("vehicle-1")).resolves.toEqual(vehicle);
    expect(repository.findById).toHaveBeenCalledWith("vehicle-1");
  });

  it.each([
    ["", "fleet-1"],
    ["vehicle-1", null],
  ])("returns null before repository lookup when detail context is incomplete", async (vehicleId, fleetId) => {
    await expect(service.getVehicleDetailForFleet(vehicleId, fleetId)).resolves.toBeNull();
    expect(repository.findByIdWithAssignment).not.toHaveBeenCalled();
  });

  it("maps the missing vehicle-subscription RPC schema cache error", async () => {
    repository.create.mockRejectedValue(
      new Error("schema cache: create_vehicle_with_subscription not found"),
    );

    await expect(
      service.createVehicle({
        fleet_id: "fleet-1",
        subscription_id: "subscription-1",
        registration: "LT-123-AA",
      }),
    ).rejects.toThrow("Le lien vehicule-abonnement n'est pas encore actif cote base de donnees.");
  });

  it("preserves non-Error repository failures as Error instances", async () => {
    repository.create.mockRejectedValue("database exploded");

    await expect(
      service.createVehicle({
        fleet_id: "fleet-1",
        subscription_id: "subscription-1",
        registration: "LT-123-AA",
      }),
    ).rejects.toThrow("database exploded");
  });

  it.each([
    ["updateVehicle", () => service.updateVehicle("", { status: "ok" })],
    ["blockVehicle", () => service.blockVehicle("", "maintenance")],
    ["unblockVehicle", () => service.unblockVehicle("")],
    ["updateKilometerage", () => service.updateKilometerage("", 0)],
    ["deleteVehicle", () => service.deleteVehicle("")],
  ])("rejects %s without a vehicle id", async (_name, action) => {
    await expect(action()).rejects.toThrow("L'ID du véhicule est requis");
  });

  it("keeps non-registration updates unchanged", async () => {
    repository.update.mockResolvedValue({ id: "vehicle-1", status: "blocked" });

    await service.updateVehicle("vehicle-1", { status: "blocked" });

    expect(repository.update).toHaveBeenCalledWith("vehicle-1", { status: "blocked" });
  });

  it("accepts zero kilometerage", async () => {
    repository.updateKilometerage.mockResolvedValue({ id: "vehicle-1", current_km: 0 });

    await service.updateKilometerage("vehicle-1", 0);

    expect(repository.updateKilometerage).toHaveBeenCalledWith("vehicle-1", 0);
  });
});
