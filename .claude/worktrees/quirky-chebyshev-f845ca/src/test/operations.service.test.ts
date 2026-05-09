import { describe, it, expect, vi } from "vitest";
import { OperationsService } from "@/services/operations.service";
import type { OperationsRepository } from "@/repositories/operations.repository";

const emptyOrganizer = {
  missionsToday: [],
  vehiclesInService: [],
  operationalIncidents: [],
  assignedTasks: [],
};

describe("OperationsService", () => {
  it("refuse un fleetId vide pour getOrganizerOperations", async () => {
    const repo = {} as OperationsRepository;
    const svc = new OperationsService(repo);
    await expect(svc.getOrganizerOperations(null)).rejects.toThrow("Identifiant de flotte requis");
  });

  it("délègue au repository pour getOrganizerOperations", async () => {
    const fetchOrganizerSnapshot = vi.fn().mockResolvedValue(emptyOrganizer);
    const repo = { fetchOrganizerSnapshot } as unknown as OperationsRepository;
    const svc = new OperationsService(repo);
    const result = await svc.getOrganizerOperations("fleet-1");
    expect(fetchOrganizerSnapshot).toHaveBeenCalledWith("fleet-1");
    expect(result).toEqual(emptyOrganizer);
  });

  it("refuse un userId vide pour getDriverOperations", async () => {
    const repo = {} as OperationsRepository;
    const svc = new OperationsService(repo);
    await expect(svc.getDriverOperations(null)).rejects.toThrow("Utilisateur non identifié");
  });
});
