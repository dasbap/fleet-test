import { describe, expect, it, vi } from "vitest";
import { DashboardAlertService } from "@/services/dashboard-alert.service";
import type { DashboardAlertRepository } from "@/repositories/dashboard-alert.repository";

function createDashboardAlertRepositoryMock() {
  return {
    findActiveByOrg: vi.fn(),
    getKpiSummary: vi.fn(),
    resolveById: vi.fn(),
    invokeAction: vi.fn(),
  };
}

describe("DashboardAlertService", () => {
  it("mappe les alertes repository en format domaine", async () => {
    const repo = createDashboardAlertRepositoryMock();
    repo.findActiveByOrg.mockResolvedValue([
      {
        id: "a1",
        plate: "AB-123",
        message: "Alerte test",
        severity: "critical",
        type: "oil",
        created_at: "2026-04-10T10:00:00Z",
        resolved_at: null,
        vehicle_id: "v1",
        vehicle_name: "Toyota",
        action: { kind: "schedule", label: "Planifier", payload: {} },
        org_id: "org-1",
      },
    ]);

    const service = new DashboardAlertService(
      repo as unknown as DashboardAlertRepository
    );
    const result = await service.getActiveAlerts("org-1");

    expect(result[0]).toMatchObject({
      id: "a1",
      vehicleId: "v1",
      vehicleName: "Toyota",
      createdAt: "2026-04-10T10:00:00Z",
      resolvedAt: null,
    });
  });

  it("exécute la résolution et l'action métier", async () => {
    const repo = createDashboardAlertRepositoryMock();
    repo.resolveById.mockResolvedValue(undefined);
    repo.invokeAction.mockResolvedValue(undefined);

    const service = new DashboardAlertService(
      repo as unknown as DashboardAlertRepository
    );

    await service.resolveAlert("a1", {
      kind: "book",
      label: "Réserver",
      payload: { workshopId: "w1" },
    });

    expect(repo.resolveById).toHaveBeenCalledWith("a1");
    expect(repo.invokeAction).toHaveBeenCalledWith("book", { workshopId: "w1" });
  });
});
