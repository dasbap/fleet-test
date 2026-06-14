import { describe, expect, it, vi } from "vitest";
import { DashcamService } from "@/services/dashcam.service";
import type { DashcamRepository } from "@/repositories/dashcam.repository";

function createService(repository: Partial<DashcamRepository>) {
  return new DashcamService(repository as DashcamRepository);
}

describe("DashcamService", () => {
  it("refuse registerDashcam sans nom", async () => {
    const service = createService({});

    await expect(
      service.registerDashcam({
        fleet_id: "fleet-1",
        name: "  ",
        brand: "Xiaomi",
      }),
    ).rejects.toThrow("Le nom de la dashcam est requis");
  });

  it("refuse sendAlerts avec tableau vide", async () => {
    const service = createService({});

    await expect(service.sendAlerts([])).rejects.toThrow("Au moins une alerte est requise");
  });

  it("liste les dashcams d'une flotte", async () => {
    const findByFleet = vi.fn().mockResolvedValue([{ id: "cam-1" }]);
    const service = createService({ findByFleet });

    const rows = await service.listDashcams("fleet-1");

    expect(findByFleet).toHaveBeenCalledWith("fleet-1");
    expect(rows).toHaveLength(1);
  });
});
