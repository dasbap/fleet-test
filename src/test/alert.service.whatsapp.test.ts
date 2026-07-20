import { describe, expect, it, vi } from "vitest";
import { AlertService } from "@/services/alert.service";
import type { AlertDto, IncidentWorkflowStatusDto } from "@/types/dto/alert.dto";
import type { AlertRepository } from "@/repositories/alert.repository";
import type { SendWhatsappEdgeService } from "@/services/send-whatsapp-edge.service";

function createAlertRepositoryMock() {
  return {
    findById: vi.fn(),
    resolve: vi.fn(),
    updateStatus: vi.fn(),
    assign: vi.fn(),
  };
}

function createWhatsappServiceMock() {
  return {
    send: vi.fn(),
  };
}

const baseAlert: AlertDto = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  fleet_id: "660e8400-e29b-41d4-a716-446655440000",
  alert_type: "maintenance_due",
  driver_user_id: "770e8400-e29b-41d4-a716-446655440000",
  vehicle_id: "880e8400-e29b-41d4-a716-446655440000",
  shift_id: null,
  severity: "high",
  message: "Maintenance urgente à planifier",
  resolved: false,
  resolved_by: null,
  resolved_at: null,
  created_at: "2026-04-15T09:00:00Z",
  status: "NOUVEAU",
  assignee_user_id: null,
  assigned_at: null,
  status_updated_at: null,
};

describe("AlertService WhatsApp rules", () => {
  it("envoie WhatsApp sur passage EN_COURS pour maintenance_due", async () => {
    const repo = createAlertRepositoryMock();
    const wa = createWhatsappServiceMock();
    repo.findById.mockResolvedValue(baseAlert);

    const service = new AlertService(
      repo as unknown as AlertRepository,
      wa as unknown as SendWhatsappEdgeService,
    );

    await service.updateAlertStatus(
      baseAlert.id,
      "EN_COURS" satisfies IncidentWorkflowStatusDto,
    );

    expect(repo.updateStatus).toHaveBeenCalledWith(baseAlert.id, "EN_COURS");
    expect(wa.send).toHaveBeenCalledWith(
      expect.objectContaining({
        fleetId: baseAlert.fleet_id,
        alertId: baseAlert.id,
        recipientUserId: baseAlert.driver_user_id,
        templateName: "maintenance_alert_in_progress_fr",
      }),
    );
  });

  it("n'envoie rien pour un type d'alerte non ciblé", async () => {
    const repo = createAlertRepositoryMock();
    const wa = createWhatsappServiceMock();
    repo.findById.mockResolvedValue({
      ...baseAlert,
      alert_type: "vehicle_blocked",
    });

    const service = new AlertService(
      repo as unknown as AlertRepository,
      wa as unknown as SendWhatsappEdgeService,
    );

    await service.updateAlertStatus(baseAlert.id, "RESOLU");

    expect(repo.updateStatus).toHaveBeenCalledWith(baseAlert.id, "RESOLU");
    expect(wa.send).not.toHaveBeenCalled();
  });

  it("utilise l'assigné comme destinataire pour une assignation", async () => {
    const repo = createAlertRepositoryMock();
    const wa = createWhatsappServiceMock();
    repo.findById.mockResolvedValue({
      ...baseAlert,
      alert_type: "document_expired",
    });

    const service = new AlertService(
      repo as unknown as AlertRepository,
      wa as unknown as SendWhatsappEdgeService,
    );

    const assignee = "990e8400-e29b-41d4-a716-446655440000";
    await service.assignAlert(baseAlert.id, assignee);

    expect(repo.assign).toHaveBeenCalledWith(baseAlert.id, assignee);
    expect(wa.send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: assignee,
        templateName: "document_expired_assigned_fr",
      }),
    );
  });
});
