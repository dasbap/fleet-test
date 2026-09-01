import { beforeEach, describe, expect, it, vi } from "vitest";
import { VehicleService } from "@/services/vehicle.service";
import type { VehicleDto } from "@/types/dto/vehicle.dto";
import type { VehicleRepository } from "@/repositories/vehicle.repository";
import type { FleetBillingService } from "@/services/fleet-billing.service";

const VEHICLE: VehicleDto = {
  id: "vehicle-1",
  fleet_id: "fleet-1",
  registration: "LT-123-AA",
  brand: "Toyota",
  model: "Hilux",
  year: 2024,
  current_km: 12500,
  status: "ok",
  blocked_reason: null,
  created_at: "2026-08-26T08:00:00.000Z",
};

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

function createBillingMock() {
  return {
    getFleetBillingContext: vi.fn(),
    assertCanAddVehicle: vi.fn(),
  };
}

describe("VehicleService - fonctionnalités véhicule", () => {
  let repository: ReturnType<typeof createRepositoryMock>;
  let billing: ReturnType<typeof createBillingMock>;
  let service: VehicleService;

  beforeEach(() => {
    repository = createRepositoryMock();
    billing = createBillingMock();
    service = new VehicleService(
      repository as unknown as VehicleRepository,
      billing as unknown as FleetBillingService,
    );
  });

  it("liste les véhicules de la flotte avec leurs affectations actives", async () => {
    repository.findAllWithAssignments.mockResolvedValue([VEHICLE]);

    await expect(service.getVehicles("fleet-1")).resolves.toEqual([VEHICLE]);
    expect(repository.findAllWithAssignments).toHaveBeenCalledWith("fleet-1");
  });

  it("normalise la recherche avant de charger la liste véhicule", async () => {
    repository.findListItems.mockResolvedValue([]);

    await service.getVehicleList({ fleet_id: "fleet-1", status: "ok", search: "  Hilux  " });

    expect(repository.findListItems).toHaveBeenCalledWith({
      fleet_id: "fleet-1",
      status: "ok",
      search: "Hilux",
    });
  });

  it("refuse de divulguer le détail d'un véhicule appartenant à une autre flotte", async () => {
    repository.findByIdWithAssignment.mockResolvedValue({
      ...VEHICLE,
      fleet_id: "fleet-other",
    });

    await expect(service.getVehicleDetailForFleet("vehicle-1", "fleet-1")).resolves.toBeNull();
  });

  it("retourne le détail lorsque le véhicule appartient à la flotte courante", async () => {
    repository.findByIdWithAssignment.mockResolvedValue(VEHICLE);

    await expect(service.getVehicleDetailForFleet("vehicle-1", "fleet-1")).resolves.toEqual(VEHICLE);
  });

  it("crée un véhicule en normalisant l'immatriculation et le kilométrage", async () => {
    billing.getFleetBillingContext.mockResolvedValue({ vehicleSlots: 5, maxVehicles: 100, vehicleCount: 1 });
    repository.create.mockImplementation(async (input) => ({
      ...VEHICLE,
      registration: input.registration,
      current_km: input.current_km ?? 0,
    }));

    const created = await service.createVehicle({
      fleet_id: "fleet-1",
      subscription_id: "subscription-1",
      registration: "  lt-999-aa  ",
      brand: "Toyota",
      model: "Hilux",
      year: 2024,
    });

    expect(billing.getFleetBillingContext).toHaveBeenCalledWith("fleet-1");
    expect(billing.assertCanAddVehicle).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith({
      fleet_id: "fleet-1",
      subscription_id: "subscription-1",
      registration: "LT-999-AA",
      brand: "Toyota",
      model: "Hilux",
      year: 2024,
      current_km: 0,
    });
    expect(created.registration).toBe("LT-999-AA");
  });

  it("n'insère pas le véhicule si le contrôle de capacité de flotte échoue", async () => {
    billing.getFleetBillingContext.mockResolvedValue({ vehicleSlots: 1, maxVehicles: 1, vehicleCount: 1 });
    billing.assertCanAddVehicle.mockImplementation(() => {
      throw new Error("Limite atteinte");
    });

    await expect(
      service.createVehicle({
        fleet_id: "fleet-1",
        subscription_id: "subscription-1",
        registration: "LT-123-AA",
      }),
    ).rejects.toThrow("Limite atteinte");

    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([
    ["limite_vehicules_abonnements_atteinte", "Vous avez atteint la limite de véhicules autorisée par vos abonnements."],
    ["limite_vehicules_abonnement_atteinte", "Vous avez atteint la limite de véhicules autorisée par vos abonnements."],
    ["subscription_id_required", "Choisissez un abonnement avant de creer le vehicule."],
    ["abonnement_inactif", "Cet abonnement n'est pas actif."],
    ["abonnement_flotte_incompatible", "L'abonnement cible n'appartient pas a la meme flotte."],
  ])("traduit l'erreur SQL %s en message métier", async (databaseError, expectedMessage) => {
    billing.getFleetBillingContext.mockResolvedValue({ vehicleSlots: 5, maxVehicles: 100, vehicleCount: 1 });
    repository.create.mockRejectedValue(new Error(databaseError));

    await expect(
      service.createVehicle({
        fleet_id: "fleet-1",
        subscription_id: "subscription-1",
        registration: "LT-123-AA",
      }),
    ).rejects.toThrow(expectedMessage);
  });

  it("normalise l'immatriculation lors d'une modification", async () => {
    repository.update.mockResolvedValue({ ...VEHICLE, registration: "CE-456-BB" });

    await service.updateVehicle("vehicle-1", { registration: " ce-456-bb " });

    expect(repository.update).toHaveBeenCalledWith("vehicle-1", {
      registration: "CE-456-BB",
    });
  });

  it("bloque un véhicule avec une raison normalisée", async () => {
    repository.update.mockResolvedValue({
      ...VEHICLE,
      status: "blocked",
      blocked_reason: "Assurance expirée",
    });

    await service.blockVehicle("vehicle-1", "  Assurance expirée  ");

    expect(repository.update).toHaveBeenCalledWith("vehicle-1", {
      status: "blocked",
      blocked_reason: "Assurance expirée",
    });
  });

  it("refuse de bloquer un véhicule sans raison", async () => {
    await expect(service.blockVehicle("vehicle-1", "   ")).rejects.toThrow(
      "Une raison de blocage est requise",
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("débloque un véhicule et efface la raison de blocage", async () => {
    repository.update.mockResolvedValue(VEHICLE);

    await service.unblockVehicle("vehicle-1");

    expect(repository.update).toHaveBeenCalledWith("vehicle-1", {
      status: "ok",
      blocked_reason: null,
    });
  });

  it("met à jour le kilométrage lorsque la valeur est valide", async () => {
    repository.updateKilometerage.mockResolvedValue({ ...VEHICLE, current_km: 13000 });

    await service.updateKilometerage("vehicle-1", 13000);

    expect(repository.updateKilometerage).toHaveBeenCalledWith("vehicle-1", 13000);
  });

  it("refuse un kilométrage négatif", async () => {
    await expect(service.updateKilometerage("vehicle-1", -1)).rejects.toThrow(
      "Le kilométrage ne peut pas être négatif",
    );
    expect(repository.updateKilometerage).not.toHaveBeenCalled();
  });

  it("supprime un véhicule existant", async () => {
    repository.findById.mockResolvedValue(VEHICLE);
    repository.delete.mockResolvedValue(undefined);

    await service.deleteVehicle("vehicle-1");

    expect(repository.findById).toHaveBeenCalledWith("vehicle-1");
    expect(repository.delete).toHaveBeenCalledWith("vehicle-1");
  });

  it("refuse de supprimer un véhicule introuvable", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.deleteVehicle("vehicle-missing")).rejects.toThrow("Véhicule introuvable");
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
