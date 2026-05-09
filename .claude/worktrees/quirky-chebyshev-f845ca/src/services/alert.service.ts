import { AlertRepository, type AlertListQueryFilters } from "@/repositories/alert.repository";
import type { AlertDto, IncidentWorkflowStatusDto } from "@/types/dto/alert.dto";
import type { Alert, AlertFilters } from "@/types/alert";
import { mapOperationalAlertDtoToDomain } from "@/services/mappers/alert.dto.mapper";
import type { WhatsappTemplateName } from "@/constants/whatsapp-templates";
import { getAlertWhatsappTemplate } from "@/constants/whatsapp-template-mapping";
import {
  sendWhatsappEdgeService,
  type SendWhatsappInput,
  type SendWhatsappEdgeService,
} from "@/services/send-whatsapp-edge.service";

export class AlertService {
  constructor(
    private repository: AlertRepository,
    private whatsappService: SendWhatsappEdgeService = sendWhatsappEdgeService,
  ) {}

  async getUnresolvedAlerts(fleetId: string): Promise<AlertDto[]> {
    if (!fleetId) return [];
    return this.repository.findUnresolvedByFleet(fleetId);
  }

  async getAlertsForFleetWithFilters(filters: AlertFilters): Promise<Alert[]> {
    const { fleetId, severity, status, type, search } = filters;

    if (!fleetId) {
      return [];
    }

    const listFilters: AlertListQueryFilters = {
      fleetId,
      severity: severity
        ? (severity === "critical"
            ? "critical"
            : severity === "warning"
            ? ("high" as const)
            : ("low" as const))
        : undefined,
      type,
      resolved: status ? status === "resolved" : undefined,
    };

    const rows = await this.repository.findByFleetWithFilters(listFilters);
    let alerts = rows.map(mapOperationalAlertDtoToDomain);

    if (status && status !== "resolved") {
      alerts = alerts.filter((alert) => alert.status === status);
    }

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      alerts = alerts.filter(
        (alert) =>
          alert.title.toLowerCase().includes(term) ||
          alert.message.toLowerCase().includes(term),
      );
    }

    alerts.sort((a, b) => {
      if (a.severity === b.severity) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      const order: Record<string, number> = {
        critical: 0,
        warning: 1,
        info: 2,
      };
      return order[a.severity] - order[b.severity];
    });

    return alerts;
  }

  async getVehicleAlertsForFleet(
    vehicleId: string,
    fleetId: string | null,
  ): Promise<AlertDto[]> {
    if (!vehicleId || !fleetId) {
      return [];
    }
    return this.repository.findUnresolvedByVehicle(vehicleId, fleetId);
  }

  async getAlertByIdForFleet(alertId: string, fleetId: string): Promise<AlertDto | null> {
    if (!alertId || !fleetId) {
      return null;
    }
    const row = await this.repository.findById(alertId);
    if (!row || row.fleet_id !== fleetId) {
      return null;
    }
    return row;
  }

  async generateAlerts(fleetId: string): Promise<unknown> {
    if (!fleetId) throw new Error('ID de flotte requis');
    return this.repository.generateAlerts(fleetId);
  }

  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    if (!alertId || !resolvedBy) throw new Error('alertId et resolvedBy requis');
    const alert = await this.repository.findById(alertId);
    await this.repository.resolve(alertId, resolvedBy);
    await this.notifyWhatsappIfEligible(alert, "resolved");
  }

  async updateAlertStatus(alertId: string, status: IncidentWorkflowStatusDto): Promise<void> {
    if (!alertId) {
      throw new Error("alertId requis");
    }

    if (!["NOUVEAU", "EN_COURS", "RESOLU"].includes(status)) {
      throw new Error("Statut d’alerte invalide");
    }

    const alert = await this.repository.findById(alertId);
    await this.repository.updateStatus(alertId, status);
    await this.notifyWhatsappIfEligible(alert, `status_${status.toLowerCase()}`);
  }

  async assignAlert(alertId: string, assigneeUserId: string | null): Promise<void> {
    if (!alertId) {
      throw new Error("alertId requis");
    }
    const alert = await this.repository.findById(alertId);
    await this.repository.assign(alertId, assigneeUserId);
    if (assigneeUserId) {
      await this.notifyWhatsappIfEligible(alert, "assigned", assigneeUserId);
    }
  }

  async getAlertComments(alertId: string) {
    if (!alertId) {
      return [];
    }
    return this.repository.listComments(alertId);
  }

  async addAlertComment(alertId: string, authorUserId: string, body: string): Promise<void> {
    if (!alertId) {
      throw new Error("alertId requis");
    }
    if (!authorUserId) {
      throw new Error("authorUserId requis");
    }
    const trimmed = body.trim();
    if (!trimmed) {
      throw new Error("Le commentaire ne peut pas être vide");
    }

    return this.repository.addComment(alertId, authorUserId, trimmed);
  }

  private async notifyWhatsappIfEligible(
    alert: AlertDto | null,
    eventKey: string,
    recipientUserIdOverride?: string,
  ): Promise<void> {
    if (!alert) {
      return;
    }

    const template = this.resolveTemplateName(alert.alert_type, eventKey);
    if (!template) {
      return;
    }

    const recipientUserId = recipientUserIdOverride ?? alert.driver_user_id ?? undefined;
    if (!recipientUserId) {
      return;
    }

    const payload: SendWhatsappInput = {
      fleetId: alert.fleet_id,
      alertId: alert.id,
      recipientUserId,
      templateName: template,
      languageCode: "fr",
      variables: [alert.message],
    };

    try {
      await this.whatsappService.send(payload);
    } catch (error) {
      console.warn("[AlertService] Envoi WhatsApp ignoré:", error);
    }
  }

  private resolveTemplateName(
    alertType: AlertDto["alert_type"],
    eventKey: string,
  ): WhatsappTemplateName | null {
    return getAlertWhatsappTemplate(alertType, eventKey);
  }
}
