import { describe, expect, it, vi } from "vitest";
import { VehicleService } from "@/services/vehicle.service";
import type { VehicleRepository } from "@/repositories/vehicle.repository";

describe("VehicleService.getVehicleList", () => {
  it("normalise la recherche et propage le filtre de statut", async () => {
    const findListItems = vi.fn().mockResolvedValue([]);
    const repository = { findListItems } as unknown as VehicleRepository;
    const service = new VehicleService(repository);

    await service.getVehicleList({
      fleet_id: "fleet-1",
      status: "blocked",
      search: "  ab-123  ",
    });

    expect(findListItems).toHaveBeenCalledWith({
      fleet_id: "fleet-1",
      status: "blocked",
      search: "ab-123",
    });
  });

  it("supprime une recherche vide après trim", async () => {
    const findListItems = vi.fn().mockResolvedValue([]);
    const repository = { findListItems } as unknown as VehicleRepository;
    const service = new VehicleService(repository);

    await service.getVehicleList({
      fleet_id: "fleet-1",
      search: "   ",
    });

    expect(findListItems).toHaveBeenCalledWith({
      fleet_id: "fleet-1",
      search: undefined,
    });
  });
});

describe("VehicleService.createVehicle", () => {
  it("retourne le message abonnement quand le backend refuse le dernier emplacement", async () => {
    const repository = {
      create: vi.fn().mockRejectedValue(new Error("limite_vehicules_abonnements_atteinte")),
    } as unknown as VehicleRepository;
    const service = new VehicleService(repository);

    await expect(
      service.createVehicle({
        fleet_id: "fleet-1",
        registration: " lt-001 ",
        brand: "Toyota",
        model: "Hiace",
        year: 2024,
        current_km: 12,
      }),
    ).rejects.toThrow("Vous avez atteint la limite de véhicules autorisée par vos abonnements.");
  });
});
