import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DashboardAlert } from "@/types/dashboard";

export interface DashboardAlertRow {
  id: string;
  plate: string;
  message: string;
  severity: DashboardAlert["severity"];
  type: DashboardAlert["type"];
  created_at: string;
  resolved_at: string | null;
  vehicle_id: string;
  vehicle_name: string;
  action: DashboardAlert["action"];
  org_id: string;
}

export class DashboardAlertRepository {
  async findActiveByOrg(orgId: string): Promise<DashboardAlertRow[]> {
    const { data, error } = await supabase
      .from("dashboard_alerts")
      .select("*")
      .eq("org_id", orgId)
      .is("resolved_at", null)
      .order("severity_rank", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching dashboard alerts:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as DashboardAlertRow[];
  }

  async resolveById(alertId: string): Promise<void> {
    const { error } = await supabase
      .from("dashboard_alerts")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", alertId);

    if (error) {
      console.error("Error resolving dashboard alert:", error);
      throw new Error(error.message);
    }
  }

  async getKpiSummary(orgId: string): Promise<unknown> {
    const { data, error } = await supabase.rpc("get_kpi_summary", { p_org_id: orgId });
    if (error) {
      console.error("Error fetching KPI summary:", error);
      throw new Error(error.message);
    }
    return data;
  }

  subscribeToOrgAlerts(
    orgId: string,
    handlers: {
      onInsert: (alert: DashboardAlertRow) => void;
      onUpdate: (alert: DashboardAlertRow) => void;
    }
  ): RealtimeChannel {
    return supabase
      .channel(`dashboard-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dashboard_alerts",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => handlers.onInsert(payload.new as DashboardAlertRow)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dashboard_alerts",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => handlers.onUpdate(payload.new as DashboardAlertRow)
      )
      .subscribe();
  }

  removeChannel(channel: RealtimeChannel): void {
    supabase.removeChannel(channel);
  }

  async invokeAction(kind: DashboardAlert["action"]["kind"], payload: Record<string, unknown>) {
    const fnMap: Record<DashboardAlert["action"]["kind"], string> = {
      schedule: "schedule-maintenance",
      immobilize: "immobilize-vehicle",
      book: "book-workshop",
      order: "order-parts",
      plan: "plan-service",
    };

    const { error } = await supabase.functions.invoke(fnMap[kind], { body: payload });
    if (error) {
      console.error("Error invoking dashboard action:", error);
      throw new Error(error.message);
    }
  }
}

export function mapDashboardAlertRowToDomain(row: DashboardAlertRow): DashboardAlert {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    plate: row.plate,
    vehicleName: row.vehicle_name,
    severity: row.severity,
    type: row.type,
    message: row.message,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    action: row.action,
  };
}
