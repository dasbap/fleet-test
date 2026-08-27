import { beforeEach, describe, expect, it, vi } from "vitest";

const mapOperationalAlertDtoToDomain = vi.fn((row: any) => ({
  id: row.id,
  title: row.title,
  message: row.message,
  severity: row.domainSeverity,
  status: row.domainStatus,
  createdAt: row.created_at,
}));
const getAlertWhatsappTemplate = vi.fn();

vi.mock("@/services/mappers/alert.dto.mapper", () => ({ mapOperationalAlertDtoToDomain }));
vi.mock("@/constants/whatsapp-template-mapping", () => ({ getAlertWhatsappTemplate }));

import { AlertService } from "@/services/alert.service";

describe("alert service mutation coverage", () => {
  let repository: any;
  let whatsapp: any;
  let service: AlertService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = {
      findUnresolvedByFleet: vi.fn(),
      findByFleetWithFilters: vi.fn(),
      findUnresolvedByVehicle: vi.fn(),
      findById: vi.fn(),
      generateAlerts: vi.fn(),
      resolve: vi.fn(),
      updateStatus: vi.fn(),
      assign: vi.fn(),
      listComments: vi.fn(),
      addComment: vi.fn(),
    };
    whatsapp = { send: vi.fn().mockResolvedValue({ success: true }) };
    service = new AlertService(repository, whatsapp);
  });

  it("covers unresolved guards and delegation", async () => {
    await expect(service.getUnresolvedAlerts("")).resolves.toEqual([]);
    expect(repository.findUnresolvedByFleet).not.toHaveBeenCalled();
    repository.findUnresolvedByFleet.mockResolvedValue([{ id: "a" }]);
    await expect(service.getUnresolvedAlerts("fleet")).resolves.toEqual([{ id: "a" }]);
    expect(repository.findUnresolvedByFleet).toHaveBeenCalledWith("fleet");
  });

  it("maps severity status type and search filters", async () => {
    repository.findByFleetWithFilters.mockResolvedValue([
      { id: "info", title: "Autre", message: "message", domainSeverity: "info", domainStatus: "active", created_at: "2026-01-01" },
      { id: "warn-old", title: "Panne moteur", message: "atelier", domainSeverity: "warning", domainStatus: "active", created_at: "2026-01-02" },
      { id: "warn-new", title: "Panne frein", message: "urgent", domainSeverity: "warning", domainStatus: "active", created_at: "2026-01-03" },
      { id: "crit", title: "Panne critique", message: "stop", domainSeverity: "critical", domainStatus: "resolved", created_at: "2026-01-04" },
    ]);
    await expect(service.getAlertsForFleetWithFilters({ fleetId: "" } as any)).resolves.toEqual([]);
    const critical = await service.getAlertsForFleetWithFilters({ fleetId: "f", severity: "critical", status: "active", type: "failure_risk", search: " panne " } as any);
    expect(repository.findByFleetWithFilters).toHaveBeenLastCalledWith({ fleetId: "f", severity: "critical", type: "failure_risk", resolved: false });
    expect(critical.map((x: any) => x.id)).toEqual(["warn-new", "warn-old"]);
    await service.getAlertsForFleetWithFilters({ fleetId: "f", severity: "warning", status: "resolved" } as any);
    expect(repository.findByFleetWithFilters).toHaveBeenLastCalledWith({ fleetId: "f", severity: "high", type: undefined, resolved: true });
    await service.getAlertsForFleetWithFilters({ fleetId: "f", severity: "info" } as any);
    expect(repository.findByFleetWithFilters).toHaveBeenLastCalledWith({ fleetId: "f", severity: "low", type: undefined, resolved: undefined });
    const byMessage = await service.getAlertsForFleetWithFilters({ fleetId: "f", search: "URGENT" } as any);
    expect(byMessage.map((x: any) => x.id)).toEqual(["warn-new"]);
  });

  it("covers vehicle and fleet scoped alert guards", async () => {
    await expect(service.getVehicleAlertsForFleet("", "f")).resolves.toEqual([]);
    await expect(service.getVehicleAlertsForFleet("v", null)).resolves.toEqual([]);
    repository.findUnresolvedByVehicle.mockResolvedValue([{ id: "a" }]);
    await expect(service.getVehicleAlertsForFleet("v", "f")).resolves.toEqual([{ id: "a" }]);
    expect(repository.findUnresolvedByVehicle).toHaveBeenCalledWith("v", "f");
    await expect(service.getAlertByIdForFleet("", "f")).resolves.toBeNull();
    await expect(service.getAlertByIdForFleet("a", "")).resolves.toBeNull();
    repository.findById.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "a", fleet_id: "other" }).mockResolvedValueOnce({ id: "a", fleet_id: "f" });
    await expect(service.getAlertByIdForFleet("a", "f")).resolves.toBeNull();
    await expect(service.getAlertByIdForFleet("a", "f")).resolves.toBeNull();
    await expect(service.getAlertByIdForFleet("a", "f")).resolves.toEqual({ id: "a", fleet_id: "f" });
  });

  it("validates alert generation", async () => {
    await expect(service.generateAlerts("")).rejects.toThrow("ID de flotte requis");
    repository.generateAlerts.mockResolvedValue({ created: 3 });
    await expect(service.generateAlerts("f")).resolves.toEqual({ created: 3 });
    expect(repository.generateAlerts).toHaveBeenCalledWith("f");
  });

  it("resolves alerts and sends mapped WhatsApp notification", async () => {
    const alert = { id: "a", fleet_id: "f", driver_user_id: "driver", alert_type: "maintenance_due", message: "Maintenance" };
    repository.findById.mockResolvedValue(alert);
    getAlertWhatsappTemplate.mockReturnValue("maintenance_alert_resolved_fr");
    await service.resolveAlert("a", "u");
    expect(repository.resolve).toHaveBeenCalledWith("a", "u");
    expect(getAlertWhatsappTemplate).toHaveBeenCalledWith("maintenance_due", "resolved");
    expect(whatsapp.send).toHaveBeenCalledWith({ fleetId: "f", alertId: "a", recipientUserId: "driver", templateName: "maintenance_alert_resolved_fr", languageCode: "fr", variables: ["Maintenance"] });
  });

  it("validates and updates workflow statuses", async () => {
    await expect(service.updateAlertStatus("", "NOUVEAU" as any)).rejects.toThrow("alertId requis");
    await expect(service.updateAlertStatus("a", "BAD" as any)).rejects.toThrow("Statut d’alerte invalide");
    const alert = { id: "a", fleet_id: "f", driver_user_id: "driver", alert_type: "maintenance_due", message: "M" };
    repository.findById.mockResolvedValue(alert);
    getAlertWhatsappTemplate.mockReturnValue("maintenance_alert_in_progress_fr");
    await service.updateAlertStatus("a", "EN_COURS" as any);
    expect(repository.updateStatus).toHaveBeenCalledWith("a", "EN_COURS");
    expect(getAlertWhatsappTemplate).toHaveBeenCalledWith("maintenance_due", "status_en_cours");
  });

  it("assigns alerts with recipient override and skips notification on unassign", async () => {
    const alert = { id: "a", fleet_id: "f", driver_user_id: "driver", alert_type: "maintenance_due", message: "M" };
    repository.findById.mockResolvedValue(alert);
    getAlertWhatsappTemplate.mockReturnValue("maintenance_alert_assigned_fr");
    await expect(service.assignAlert("", "u")).rejects.toThrow("alertId requis");
    await service.assignAlert("a", "assignee");
    expect(repository.assign).toHaveBeenCalledWith("a", "assignee");
    expect(whatsapp.send).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: "assignee" }));
    whatsapp.send.mockClear();
    await service.assignAlert("a", null);
    expect(repository.assign).toHaveBeenLastCalledWith("a", null);
    expect(whatsapp.send).not.toHaveBeenCalled();
  });

  it("skips WhatsApp when alert template or recipient is missing", async () => {
    repository.findById.mockResolvedValue(null);
    await service.resolveAlert("a", "u");
    expect(whatsapp.send).not.toHaveBeenCalled();
    repository.findById.mockResolvedValue({ id: "a", fleet_id: "f", driver_user_id: "u", alert_type: "speeding", message: "M" });
    getAlertWhatsappTemplate.mockReturnValue(null);
    await service.resolveAlert("a", "u");
    expect(whatsapp.send).not.toHaveBeenCalled();
    repository.findById.mockResolvedValue({ id: "a", fleet_id: "f", driver_user_id: null, alert_type: "maintenance_due", message: "M" });
    getAlertWhatsappTemplate.mockReturnValue("maintenance_alert_resolved_fr");
    await service.resolveAlert("a", "u");
    expect(whatsapp.send).not.toHaveBeenCalled();
  });

  it("swallows WhatsApp errors after repository mutation", async () => {
    repository.findById.mockResolvedValue({ id: "a", fleet_id: "f", driver_user_id: "u", alert_type: "maintenance_due", message: "M" });
    getAlertWhatsappTemplate.mockReturnValue("maintenance_alert_resolved_fr");
    whatsapp.send.mockRejectedValue(new Error("wa down"));
    await expect(service.resolveAlert("a", "u")).resolves.toBeUndefined();
    expect(repository.resolve).toHaveBeenCalled();
  });

  it("covers comments guards trimming and delegation", async () => {
    await expect(service.getAlertComments("")).resolves.toEqual([]);
    repository.listComments.mockResolvedValue([{ id: "c" }]);
    await expect(service.getAlertComments("a")).resolves.toEqual([{ id: "c" }]);
    await expect(service.addAlertComment("", "u", "x")).rejects.toThrow("alertId requis");
    await expect(service.addAlertComment("a", "", "x")).rejects.toThrow("authorUserId requis");
    await expect(service.addAlertComment("a", "u", "   ")).rejects.toThrow("Le commentaire ne peut pas être vide");
    repository.addComment.mockResolvedValue(undefined);
    await service.addAlertComment("a", "u", "  hello  ");
    expect(repository.addComment).toHaveBeenCalledWith("a", "u", "hello");
  });
});
