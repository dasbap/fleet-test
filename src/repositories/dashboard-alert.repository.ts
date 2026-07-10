import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { DASHBOARD_EMPTY_KPIS } from "@/lib/dashboard-kpis";
import type { DashboardAlert, KpiSummary } from "@/types/dashboard";

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

interface AlertesAutomatiquesRow {
  id: string;
  fleet_id: string;
  alert_type: string | null;
  severity: string | null;
  message: string | null;
  resolved_at?: string | null;
  created_at: string;
  vehicle_id: string | null;
}

interface VehicleLiteRow {
  id: string;
  registration: string;
  brand: string | null;
  model: string | null;
}

function isMissingSchemaObject(error: { code?: string; message?: string } | null | undefined) {
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    error?.message?.includes("Could not find the table")
  );
}

function normalizeSeverity(severity: string | null): DashboardAlert["severity"] {
  if (severity === "critical") return "critical";
  if (severity === "high" || severity === "medium" || severity === "warning") {
    return "warning";
  }
  return "info";
}

function normalizeAlertType(alertType: string | null): DashboardAlert["type"] {
  switch (alertType) {
    case "vehicle_blocked":
      return "brakes";
    case "maintenance_due":
    case "failure_risk":
      return "revision";
    case "document_expired":
      return "ct";
    default:
      return "custom";
  }
}

function buildAction(row: AlertesAutomatiquesRow): DashboardAlert["action"] {
  const kind: DashboardAlert["action"]["kind"] =
    row.alert_type === "vehicle_blocked"
      ? "immobilize"
      : row.alert_type === "document_expired"
        ? "plan"
        : "schedule";

  const label =
    kind === "immobilize"
      ? "Immobiliser ->"
      : kind === "plan"
        ? "Planifier ->"
        : "Traiter ->";

  return {
    kind,
    label,
    payload: {
      alertId: row.id,
      fleetId: row.fleet_id,
      vehicleId: row.vehicle_id,
      type: row.alert_type,
    },
  };
}

function mapAlertesRowToDashboardRow(
  row: AlertesAutomatiquesRow,
  orgId: string,
  vehiclesById: Map<string, VehicleLiteRow>,
): DashboardAlertRow {
  const vehicle = row.vehicle_id ? vehiclesById.get(row.vehicle_id) : null;
  const vehicleName = vehicle
    ? [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || vehicle.registration
    : "Vehicule";

  return {
    id: row.id,
    vehicleId: row.vehicle_id ?? row.id,
    vehicle_id: row.vehicle_id ?? row.id,
    plate: vehicle?.registration ?? "Vehicule",
    vehicleName,
    vehicle_name: vehicleName,
    severity: normalizeSeverity(row.severity),
    type: normalizeAlertType(row.alert_type),
    message: row.message ?? "Alerte flotte a traiter",
    createdAt: row.created_at,
    created_at: row.created_at,
    resolvedAt: row.resolved_at ?? null,
    resolved_at: row.resolved_at ?? null,
    action: buildAction(row),
    org_id: orgId,
  } as DashboardAlertRow;
}

async function findFleetIdsByOrg(orgId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("flottes")
    .select("id")
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((fleet) => fleet.id);
}

export class DashboardAlertRepository {
  async findActiveByOrg(orgId: string): Promise<DashboardAlertRow[]> {
    const fleetIds = await findFleetIdsByOrg(orgId);
    if (fleetIds.length === 0) return [];

    const { data: alerts, error } = await supabase
      .from("alertes_automatiques")
      .select("id, fleet_id, alert_type, severity, message, resolved_at, created_at, vehicle_id")
      .in("fleet_id", fleetIds)
      .eq("resolved", false)
      .order("created_at", { ascending: false });

    if (isMissingSchemaObject(error)) return [];
    if (error) throw new Error(error.message);

    const rows = (alerts ?? []) as AlertesAutomatiquesRow[];
    const vehicleIds = [...new Set(rows.map((row) => row.vehicle_id).filter(Boolean))] as string[];
    const { data: vehicles, error: vehiclesError } = vehicleIds.length
      ? await supabase
          .from("vehicules")
          .select("id, registration, brand, model")
          .in("id", vehicleIds)
      : { data: [], error: null };

    if (vehiclesError) throw new Error(vehiclesError.message);

    const vehiclesById = new Map(
      ((vehicles ?? []) as VehicleLiteRow[]).map((vehicle) => [vehicle.id, vehicle]),
    );

    return rows
      .map((row) => mapAlertesRowToDashboardRow(row, orgId, vehiclesById))
      .sort((a, b) => {
        const severityRank = { critical: 0, warning: 1, info: 2 };
        return severityRank[a.severity] - severityRank[b.severity];
      });
  }

  async resolveById(alertId: string): Promise<void> {
    const { error } = await supabase
      .from("alertes_automatiques")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", alertId);

    if (isMissingSchemaObject(error)) return;
    if (error) throw new Error(error.message);
  }

  async getKpiSummary(orgId: string): Promise<KpiSummary> {
    const fleetIds = await findFleetIdsByOrg(orgId);
    if (fleetIds.length === 0) return DASHBOARD_EMPTY_KPIS;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [vehiclesResult, maintenanceResult, alertsResult] = await Promise.all([
      supabase
        .from("vehicules")
        .select("status, created_at")
        .in("fleet_id", fleetIds),
      supabase
        .from("travaux_maintenance")
        .select("id")
        .in("fleet_id", fleetIds)
        .eq("status", "in_progress"),
      supabase
        .from("alertes_automatiques")
        .select("severity, alert_type, created_at")
        .in("fleet_id", fleetIds)
        .eq("resolved", false),
    ]);

    if (vehiclesResult.error) throw new Error(vehiclesResult.error.message);
    if (maintenanceResult.error) throw new Error(maintenanceResult.error.message);
    if (isMissingSchemaObject(alertsResult.error)) {
      return {
        ...DASHBOARD_EMPTY_KPIS,
        activeVehicles: (vehiclesResult.data ?? []).filter((row) => row.status === "ok").length,
        inMaintenance: maintenanceResult.data?.length ?? 0,
      };
    }
    if (alertsResult.error) throw new Error(alertsResult.error.message);

    const vehicles = vehiclesResult.data ?? [];
    const alerts = alertsResult.data ?? [];
    return {
      activeVehicles: vehicles.filter((row) => row.status === "ok").length,
      inMaintenance: maintenanceResult.data?.length ?? 0,
      criticalAlerts: alerts.filter((row) => row.severity === "critical").length,
      overdueServices: alerts.filter((row) => row.alert_type === "maintenance_due").length,
      deltaCritical: alerts.filter(
        (row) => row.severity === "critical" && row.created_at >= twentyFourHoursAgo,
      ).length,
      deltaActive: vehicles.filter((row) => row.created_at >= thirtyDaysAgo).length,
    };
  }

  subscribeToOrgAlerts(
    orgId: string,
    handlers: {
      onInsert: (alert: DashboardAlertRow) => void;
      onUpdate: (alert: DashboardAlertRow) => void;
    },
  ): RealtimeChannel {
    const emptyVehicles = new Map<string, VehicleLiteRow>();
    return supabase
      .channel(`dashboard-alertes-${orgId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alertes_automatiques" },
        (payload) =>
          handlers.onInsert(
            mapAlertesRowToDashboardRow(payload.new as AlertesAutomatiquesRow, orgId, emptyVehicles),
          ),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alertes_automatiques" },
        (payload) =>
          handlers.onUpdate(
            mapAlertesRowToDashboardRow(payload.new as AlertesAutomatiquesRow, orgId, emptyVehicles),
          ),
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
