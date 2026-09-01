import { beforeEach, describe, expect, it, vi } from "vitest";

const { mapOperationalAlertDtoToDomain, getAlertWhatsappTemplate } = vi.hoisted(() => ({
  mapOperationalAlertDtoToDomain: vi.fn((row: any) => ({ id: row.id, title: row.title, message: row.message, severity: row.domainSeverity, status: row.domainStatus, createdAt: row.created_at })),
  getAlertWhatsappTemplate: vi.fn(),
}));
vi.mock("@/services/mappers/alert.dto.mapper", () => ({ mapOperationalAlertDtoToDomain }));
vi.mock("@/constants/whatsapp-template-mapping", () => ({ getAlertWhatsappTemplate }));

import { AlertService } from "@/services/alert.service";

describe("alert service mutation coverage", () => {
  let repository: any;
  let whatsapp: any;
  let service: AlertService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = { findUnresolvedByFleet: vi.fn(), findByFleetWithFilters: vi.fn(), findUnresolvedByVehicle: vi.fn(), findById: vi.fn(), generateAlerts: vi.fn(), resolve: vi.fn(), updateStatus: vi.fn(), assign: vi.fn(), listComments: vi.fn(), addComment: vi.fn() };
    whatsapp = { send: vi.fn().mockResolvedValue({ success: true }) };
    service = new AlertService(repository, whatsapp);
  });

  it("covers guards and basic reads", async () => {
    await expect(service.getUnresolvedAlerts("")).resolves.toEqual([]);
    repository.findUnresolvedByFleet.mockResolvedValue([{ id: "a" }]);
    await expect(service.getUnresolvedAlerts("f")).resolves.toEqual([{ id: "a" }]);
    await expect(service.getVehicleAlertsForFleet("", "f")).resolves.toEqual([]);
    await expect(service.getVehicleAlertsForFleet("v", null)).resolves.toEqual([]);
    repository.findUnresolvedByVehicle.mockResolvedValue([{ id: "v" }]);
    await expect(service.getVehicleAlertsForFleet("v", "f")).resolves.toEqual([{ id: "v" }]);
    await expect(service.getAlertByIdForFleet("", "f")).resolves.toBeNull();
    repository.findById.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "a", fleet_id: "other" }).mockResolvedValueOnce({ id: "a", fleet_id: "f" });
    await expect(service.getAlertByIdForFleet("a", "f")).resolves.toBeNull();
    await expect(service.getAlertByIdForFleet("a", "f")).resolves.toBeNull();
    await expect(service.getAlertByIdForFleet("a", "f")).resolves.toEqual({ id: "a", fleet_id: "f" });
  });

  it("maps filters search and sorting", async () => {
    repository.findByFleetWithFilters.mockResolvedValue([
      { id: "old", title: "Panne moteur", message: "atelier", domainSeverity: "warning", domainStatus: "active", created_at: "2026-01-02" },
      { id: "new", title: "Panne frein", message: "urgent", domainSeverity: "warning", domainStatus: "active", created_at: "2026-01-03" },
      { id: "other", title: "Info", message: "x", domainSeverity: "info", domainStatus: "resolved", created_at: "2026-01-04" },
    ]);
    await expect(service.getAlertsForFleetWithFilters({ fleetId: "" } as any)).resolves.toEqual([]);
    const rows = await service.getAlertsForFleetWithFilters({ fleetId: "f", severity: "critical", status: "active", type: "failure_risk", search: " panne " } as any);
    expect(repository.findByFleetWithFilters).toHaveBeenCalledWith({ fleetId: "f", severity: "critical", type: "failure_risk", resolved: false });
    expect(rows.map((x: any) => x.id)).toEqual(["new", "old"]);
    await service.getAlertsForFleetWithFilters({ fleetId: "f", severity: "warning", status: "resolved" } as any);
    expect(repository.findByFleetWithFilters).toHaveBeenLastCalledWith({ fleetId: "f", severity: "high", type: undefined, resolved: true });
  });

  it("generates resolves updates and assigns alerts", async () => {
    await expect(service.generateAlerts("")).rejects.toThrow("ID de flotte requis");
    repository.generateAlerts.mockResolvedValue({ created: 2 });
    await expect(service.generateAlerts("f")).resolves.toEqual({ created: 2 });
    const alert = { id: "a", fleet_id: "f", driver_user_id: "driver", alert_type: "maintenance_due", message: "Maintenance" };
    repository.findById.mockResolvedValue(alert);
    getAlertWhatsappTemplate.mockReturnValue("maintenance_alert_resolved_fr");
    await service.resolveAlert("a", "u");
    expect(repository.resolve).toHaveBeenCalledWith("a", "u");
    expect(whatsapp.send).toHaveBeenCalledWith(expect.objectContaining({ fleetId: "f", alertId: "a", recipientUserId: "driver", languageCode: "fr" }));
    await expect(service.updateAlertStatus("", "NOUVEAU" as any)).rejects.toThrow("alertId requis");
    await expect(service.updateAlertStatus("a", "BAD" as any)).rejects.toThrow("Statut d’alerte invalide");
    getAlertWhatsappTemplate.mockReturnValue("maintenance_alert_in_progress_fr");
    await service.updateAlertStatus("a", "EN_COURS" as any);
    expect(repository.updateStatus).toHaveBeenCalledWith("a", "EN_COURS");
    await expect(service.assignAlert("", "u")).rejects.toThrow("alertId requis");
    getAlertWhatsappTemplate.mockReturnValue("maintenance_alert_assigned_fr");
    await service.assignAlert("a", "assignee");
    expect(repository.assign).toHaveBeenCalledWith("a", "assignee");
  });

  it("skips or swallows WhatsApp notification failures", async () => {
    repository.findById.mockResolvedValue(null);
    await service.resolveAlert("a", "u");
    expect(whatsapp.send).not.toHaveBeenCalled();
    repository.findById.mockResolvedValue({ id: "a", fleet_id: "f", driver_user_id: "u", alert_type: "speeding", message: "M" });
    getAlertWhatsappTemplate.mockReturnValue(null);
    await service.resolveAlert("a", "u");
    expect(whatsapp.send).not.toHaveBeenCalled();
    repository.findById.mockResolvedValue({ id: "a", fleet_id: "f", driver_user_id: "u", alert_type: "maintenance_due", message: "M" });
    getAlertWhatsappTemplate.mockReturnValue("maintenance_alert_resolved_fr");
    whatsapp.send.mockRejectedValue(new Error("down"));
    await expect(service.resolveAlert("a", "u")).resolves.toBeUndefined();
  });

  it("validates comments", async () => {
    await expect(service.getAlertComments("")).resolves.toEqual([]);
    repository.listComments.mockResolvedValue([{ id: "c" }]);
    await expect(service.getAlertComments("a")).resolves.toEqual([{ id: "c" }]);
    await expect(service.addAlertComment("", "u", "x")).rejects.toThrow("alertId requis");
    await expect(service.addAlertComment("a", "", "x")).rejects.toThrow("authorUserId requis");
    await expect(service.addAlertComment("a", "u", "   ")).rejects.toThrow("Le commentaire ne peut pas être vide");
    await service.addAlertComment("a", "u", "  hello  ");
    expect(repository.addComment).toHaveBeenCalledWith("a", "u", "hello");
  });
});
