import { beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeNotificationService } from "@/services/realtime-notification.service";

const makeRepository = () => ({
  getClosureNotificationContext: vi.fn(),
  getVehicleForIncident: vi.fn(),
  getVehicleRegistration: vi.fn(),
});

describe("RealtimeNotificationService", () => {
  let repository: ReturnType<typeof makeRepository>;
  let service: RealtimeNotificationService;

  beforeEach(() => {
    repository = makeRepository();
    service = new RealtimeNotificationService(repository as never);
  });

  it("ignore une clôture sans shift", async () => {
    await expect(service.handleClosureInsert({}, "fleet-1")).resolves.toBeNull();
    expect(repository.getClosureNotificationContext).not.toHaveBeenCalled();
  });

  it("ignore une clôture hors contexte", async () => {
    repository.getClosureNotificationContext.mockResolvedValue(null);
    await expect(service.handleClosureInsert({ shift_id: "shift-1" }, "fleet-1")).resolves.toBeNull();
  });

  it("construit la notification de clôture", async () => {
    repository.getClosureNotificationContext.mockResolvedValue({
      fleetId: "fleet-1",
      driverUserId: "driver-1",
      driverFullName: "Awa Ndiaye",
      revenueDeclared: 45000,
    });
    await expect(
      service.handleClosureInsert({ shift_id: "shift-1", revenue_declared: 45000 }, "fleet-1"),
    ).resolves.toEqual({
      toast: {
        title: "Nouvelle clôture de créneau",
        description: "Awa Ndiaye a terminé son créneau avec 45000 FCFA de revenus.",
      },
      invalidateKeys: [
        ["dashboard-stats"],
        ["recent-activity"],
        ["fleet-pending-closures"],
        ["operations"],
      ],
    });
  });

  it("utilise le fallback chauffeur", async () => {
    repository.getClosureNotificationContext.mockResolvedValue({
      fleetId: "fleet-1",
      driverUserId: "driver-1",
      driverFullName: null,
      revenueDeclared: 0,
    });
    const result = await service.handleClosureInsert({ shift_id: "shift-1" }, "fleet-1");
    expect(result?.toast?.description).toContain("Un chauffeur");
  });

  it("ignore un incident sans véhicule", async () => {
    await expect(service.handleIncidentInsert({}, "fleet-1")).resolves.toBeNull();
  });

  it("ignore un véhicule introuvable ou d'une autre flotte", async () => {
    repository.getVehicleForIncident.mockResolvedValueOnce(null).mockResolvedValueOnce({
      registration: "AA-111-AA",
      fleet_id: "fleet-2",
    });
    await expect(service.handleIncidentInsert({ vehicle_id: "v1" }, "fleet-1")).resolves.toBeNull();
    await expect(service.handleIncidentInsert({ vehicle_id: "v1" }, "fleet-1")).resolves.toBeNull();
  });

  it.each([
    ["low", "faible", "default"],
    ["medium", "moyenne", "default"],
    ["high", "haute", "default"],
    ["critical", "critique", "destructive"],
    ["custom", "custom", "default"],
  ])("construit la notification incident %s", async (severity, label, variant) => {
    repository.getVehicleForIncident.mockResolvedValue({ registration: "AA-111-AA", fleet_id: "fleet-1" });
    const result = await service.handleIncidentInsert(
      { vehicle_id: "v1", severity, description: "x".repeat(80) },
      "fleet-1",
    );
    expect(result?.toast).toMatchObject({
      title: `Nouvel incident (${label})`,
      variant,
    });
    expect(result?.toast?.description).toBe(`Véhicule AA-111-AA: ${"x".repeat(50)}...`);
  });

  it("gère les fallbacks incident", async () => {
    repository.getVehicleForIncident.mockResolvedValue({ registration: "", fleet_id: "fleet-1" });
    const result = await service.handleIncidentInsert({ vehicle_id: "v1" }, "fleet-1");
    expect(result?.toast).toMatchObject({
      title: "Nouvel incident (undefined)",
      description: "Véhicule inconnu: ...",
      variant: "default",
    });
  });

  it("ignore une maintenance d'une autre flotte ou sans véhicule", async () => {
    await expect(service.handleMaintenanceInsert({ fleet_id: "fleet-2", vehicle_id: "v1" }, "fleet-1")).resolves.toBeNull();
    await expect(service.handleMaintenanceInsert({ fleet_id: "fleet-1" }, "fleet-1")).resolves.toBeNull();
  });

  it.each([
    ["low", "basse"],
    ["medium", "moyenne"],
    ["high", "haute"],
    ["critical", "critique"],
    ["custom", "custom"],
  ])("construit la notification maintenance %s", async (priority, label) => {
    repository.getVehicleRegistration.mockResolvedValue("BB-222-BB");
    const result = await service.handleMaintenanceInsert(
      { fleet_id: "fleet-1", vehicle_id: "v1", priority },
      "fleet-1",
    );
    expect(result?.toast?.description).toBe(`Véhicule BB-222-BB - Priorité ${label}`);
  });

  it("utilise les fallbacks maintenance", async () => {
    repository.getVehicleRegistration.mockResolvedValue(null);
    const result = await service.handleMaintenanceInsert(
      { fleet_id: "fleet-1", vehicle_id: "v1" },
      "fleet-1",
    );
    expect(result?.toast?.description).toBe("Véhicule inconnu - Priorité undefined");
  });

  it("ignore une mise à jour maintenance non pertinente", async () => {
    await expect(
      service.handleMaintenanceUpdate({ new: { fleet_id: "fleet-2", vehicle_id: "v1", status: "ready" }, old: { status: "queued" } }, "fleet-1"),
    ).resolves.toBeNull();
    await expect(
      service.handleMaintenanceUpdate({ new: { fleet_id: "fleet-1", vehicle_id: "v1", status: "queued" }, old: { status: "queued" } }, "fleet-1"),
    ).resolves.toBeNull();
    await expect(
      service.handleMaintenanceUpdate({ new: { fleet_id: "fleet-1", status: "ready" }, old: { status: "queued" } }, "fleet-1"),
    ).resolves.toBeNull();
  });

  it.each([
    ["queued", "en attente"],
    ["in_progress", "en cours"],
    ["ready", "terminée"],
    ["blocked", "bloquée"],
    ["custom", "custom"],
  ])("construit la mise à jour maintenance %s", async (status, label) => {
    repository.getVehicleRegistration.mockResolvedValue("CC-333-CC");
    const result = await service.handleMaintenanceUpdate(
      { new: { id: "job-1", fleet_id: "fleet-1", vehicle_id: "v1", status }, old: { status: "queued-old" } },
      "fleet-1",
    );
    expect(result).toEqual({
      toast: {
        title: "Statut maintenance mis à jour",
        description: `CC-333-CC: ${label}`,
      },
      invalidateKeys: [["maintenance-jobs"], ["maintenance-job", "job-1"]],
    });
  });

  it("gère les fallbacks de mise à jour maintenance", async () => {
    repository.getVehicleRegistration.mockResolvedValue(null);
    const result = await service.handleMaintenanceUpdate(
      { new: { fleet_id: "fleet-1", vehicle_id: "v1" }, old: { status: "queued" } },
      "fleet-1",
    );
    expect(result?.toast?.description).toBe("Véhicule: undefined");
    expect(result?.invalidateKeys).toEqual([["maintenance-jobs"], ["maintenance-job", ""]]);
  });
});
