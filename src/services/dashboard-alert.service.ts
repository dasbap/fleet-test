import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DashboardAlert, KpiSummary } from "@/types/dashboard";
import {
  DashboardAlertRepository,
  mapDashboardAlertRowToDomain,
  type DashboardAlertRow,
} from "@/repositories/dashboard-alert.repository";
import {
  sendWhatsappEdgeService,
  type SendWhatsappEdgeService,
  type SendWhatsappInput,
} from "@/services/send-whatsapp-edge.service";
import type { WhatsappTemplateName } from "@/constants/whatsapp-templates";
import { getDashboardWhatsappTemplate } from "@/constants/whatsapp-template-mapping";

export class DashboardAlertService {
  constructor(
    private repository: DashboardAlertRepository,
    private whatsappService: SendWhatsappEdgeService = sendWhatsappEdgeService,
  ) {}

  async getActiveAlerts(orgId: string): Promise<DashboardAlert[]> {
    if (!orgId) return [];
    const rows = await this.repository.findActiveByOrg(orgId);
    return rows.map(mapDashboardAlertRowToDomain);
  }

  async getKpiSummary(orgId: string): Promise<KpiSummary> {
    if (!orgId) {
      throw new Error("L'ID de l'organisation est requis");
    }
    return this.repository.getKpiSummary(orgId);
  }

  async resolveAlert(alertId: string, action: DashboardAlert["action"]): Promise<void> {
    if (!alertId) {
      throw new Error("L'ID de l'alerte est requis");
    }
    await Promise.all([
      this.repository.resolveById(alertId),
      this.repository.invokeAction(action.kind, action.payload),
    ]);
    await this.notifyWhatsappForDashboardAction(alertId, action);
  }

  subscribeToAlerts(
    orgId: string,
    handlers: {
      onInsert: (alert: DashboardAlert) => void;
      onUpdate: (alert: DashboardAlert) => void;
    }
  ): RealtimeChannel {
    if (!orgId) {
      throw new Error("L'ID de l'organisation est requis");
    }
    return this.repository.subscribeToOrgAlerts(orgId, {
      onInsert: (row) => handlers.onInsert(mapDashboardAlertRowToDomain(row)),
      onUpdate: (row) => handlers.onUpdate(mapDashboardAlertRowToDomain(row)),
    });
  }

  unsubscribe(channel: RealtimeChannel): void {
    this.repository.removeChannel(channel);
  }

  /** Mappe une ligne Realtime (postgres_changes) vers le domaine applicatif. */
  mapRealtimePayloadToAlert(payload: unknown): DashboardAlert {
    const row = payload as DashboardAlertRow;
    if (!row || typeof row.id !== "string") {
      throw new Error("Payload Realtime alerte invalide");
    }
    return mapDashboardAlertRowToDomain(row);
  }

  private async notifyWhatsappForDashboardAction(
    alertId: string,
    action: DashboardAlert["action"],
  ): Promise<void> {
    const payload = action.payload as Record<string, unknown>;
    const fleetId =
      typeof payload.fleetId === "string"
        ? payload.fleetId
        : typeof payload.orgId === "string"
          ? payload.orgId
          : null;

    if (!fleetId) {
      return;
    }

    const recipientUserId =
      typeof payload.recipientUserId === "string" ? payload.recipientUserId : undefined;
    const recipientPhone =
      typeof payload.recipientPhone === "string" ? payload.recipientPhone : undefined;

    if (!recipientUserId && !recipientPhone) {
      return;
    }

    const templateName = this.resolveDashboardTemplate(action.kind);
    if (!templateName) {
      return;
    }

    const whatsappPayload: SendWhatsappInput = {
      fleetId,
      alertId,
      recipientUserId,
      recipientPhone,
      templateName,
      languageCode: "fr",
      variables: [],
    };

    try {
      await this.whatsappService.send(whatsappPayload);
    } catch (error) {
      console.warn("[DashboardAlertService] Envoi WhatsApp ignoré:", error);
    }
  }

  private resolveDashboardTemplate(
    kind: DashboardAlert["action"]["kind"],
  ): WhatsappTemplateName | null {
    return getDashboardWhatsappTemplate(kind);
  }
}
