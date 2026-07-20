import { describe, expect, it, vi } from "vitest";
import { MaintenanceService } from "@/services/maintenance.service";
import type { MaintenanceRepository } from "@/repositories/maintenance.repository";

const existingJob = {
  id: "job-1",
  vehicle_id: "veh-1",
  fleet_id: "fleet-1",
  created_from_incident_id: "inc-1",
  priority: "medium" as const,
  status: "queued" as const,
  created_at: "2026-06-12T00:00:00.000Z",
  closed_at: null,
};

describe("MaintenanceService.createFromIncident", () => {
  it("retourne une intervention existante en attente sans recréer", async () => {
    const findLatestByIncidentId = vi.fn().mockResolvedValue(existingJob);
    const create = vi.fn();
    const repository = { findLatestByIncidentId, create } as unknown as MaintenanceRepository;
    const service = new MaintenanceService(repository);

    const result = await service.createFromIncident("inc-1", "veh-1", "fleet-1", "high");

    expect(result).toBe(existingJob);
    expect(findLatestByIncidentId).toHaveBeenCalledWith("inc-1", "fleet-1");
    expect(create).not.toHaveBeenCalled();
  });

  it("crée une intervention si aucune n'existe déjà pour l'incident", async () => {
    const findLatestByIncidentId = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue(existingJob);
    const repository = { findLatestByIncidentId, create } as unknown as MaintenanceRepository;
    const service = new MaintenanceService(repository);

    const result = await service.createFromIncident(
      "inc-1",
      "veh-1",
      "fleet-1",
      "high",
      "  Notes mécanicien  ",
    );

    expect(result).toBe(existingJob);
    expect(create).toHaveBeenCalledWith({
      vehicle_id: "veh-1",
      fleet_id: "fleet-1",
      created_from_incident_id: "inc-1",
      priority: "high",
      status: "queued",
      notes: "Notes mécanicien",
    });
  });
});

describe("MaintenanceService.updateMaintenanceJob", () => {
  it("vérifie la recette avant passage au statut ready", async () => {
    const verifyClosureReadiness = vi.fn().mockResolvedValue({
      peut_cloturer: false,
      message_blocage: "Ajoutez au moins une photo avant intervention.",
    });
    const update = vi.fn();
    const repository = { verifyClosureReadiness, update } as unknown as MaintenanceRepository;
    const service = new MaintenanceService(repository);

    await expect(
      service.updateMaintenanceJob("job-1", { status: "ready" }),
    ).rejects.toThrow("Ajoutez au moins une photo avant intervention.");
    expect(verifyClosureReadiness).toHaveBeenCalledWith("job-1");
    expect(update).not.toHaveBeenCalled();
  });

  it("met à jour le statut ready quand la recette est valide", async () => {
    const updatedJob = { ...existingJob, status: "ready" as const };
    const verifyClosureReadiness = vi.fn().mockResolvedValue({
      peut_cloturer: true,
      message_blocage: null,
    });
    const update = vi.fn().mockResolvedValue(updatedJob);
    const repository = { verifyClosureReadiness, update } as unknown as MaintenanceRepository;
    const service = new MaintenanceService(repository);

    const result = await service.updateMaintenanceJob("job-1", { status: "ready" });

    expect(result).toBe(updatedJob);
    expect(update).toHaveBeenCalledWith("job-1", { status: "ready" });
  });
});
