import { describe, expect, it, vi } from "vitest";
import { DashboardAlertService } from "@/services/dashboard-alert.service";
import type { DashboardAlertRepository } from "@/repositories/dashboard-alert.repository";
import type { SendWhatsappEdgeService } from "@/services/send-whatsapp-edge.service";

function createDashboardAlertRepositoryMock() {
  return {
    resolveById: vi.fn(),
    invokeAction: vi.fn(),
  } as unknown as DashboardAlertRepository;
}

function createWhatsappServiceMock() {
  return {
    send: vi.fn(),
  };
}

describe("DashboardAlertService WhatsApp rules", () => {
  it("envoie WhatsApp pour une action maintenance avec destinataire", async () => {
    const repo = createDashboardAlertRepositoryMock();
    const wa = createWhatsappServiceMock();
    const service = new DashboardAlertService(repo, wa as unknown as SendWhatsappEdgeService);

    await service.resolveAlert("a1", {
      kind: "schedule",
      label: "Planifier",
      payload: {
        fleetId: "f1",
        recipientUserId: "u1",
      },
    });

    expect(wa.send).toHaveBeenCalledWith(
      expect.objectContaining({
        fleetId: "f1",
        alertId: "a1",
        recipientUserId: "u1",
        templateName: "maintenance_alert_action_required_fr",
      }),
    );
  });

  it("n'envoie pas WhatsApp sans destinataire", async () => {
    const repo = createDashboardAlertRepositoryMock();
    const wa = createWhatsappServiceMock();
    const service = new DashboardAlertService(repo, wa as unknown as SendWhatsappEdgeService);

    await service.resolveAlert("a2", {
      kind: "plan",
      label: "Planifier",
      payload: {
        fleetId: "f2",
      },
    });

    expect(wa.send).not.toHaveBeenCalled();
  });
});
