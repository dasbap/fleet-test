import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DashboardAlert, KpiSummary } from "@/types/dashboard";
import {
  DashboardAlertRepository,
  mapDashboardAlertRowToDomain,
} from "@/repositories/dashboard-alert.repository";

export class DashboardAlertService {
  constructor(private repository: DashboardAlertRepository) {}

  async getActiveAlerts(orgId: string): Promise<DashboardAlert[]> {
    if (!orgId) return [];
    const rows = await this.repository.findActiveByOrg(orgId);
    return rows.map(mapDashboardAlertRowToDomain);
  }

  async getKpiSummary(orgId: string): Promise<KpiSummary | null> {
    if (!orgId) return null;
    const data = await this.repository.getKpiSummary(orgId);
    return (data ?? null) as KpiSummary | null;
  }

  async resolveAlert(alertId: string, action: DashboardAlert["action"]): Promise<void> {
    if (!alertId) {
      throw new Error("L'ID de l'alerte est requis");
    }
    await Promise.all([
      this.repository.resolveById(alertId),
      this.repository.invokeAction(action.kind, action.payload),
    ]);
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
}
