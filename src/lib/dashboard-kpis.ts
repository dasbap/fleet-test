import { isValidUuid } from "@/lib/isUuid";
import type { DashboardAlert, KpiSummary } from "@/types/dashboard";

/** KPI par défaut lorsque la RPC est indisponible ou l'org n'est pas résolue. */
export const DASHBOARD_EMPTY_KPIS: KpiSummary = {
  activeVehicles: 0,
  inMaintenance: 0,
  criticalAlerts: 0,
  overdueServices: 0,
  deltaCritical: 0,
  deltaActive: 0,
};

export interface DashboardKpisStatsFallback {
  activeVehicles?: number;
  maintenanceInProgress?: number;
}

/** Reconstruit des KPI exploitables à partir des stats flotte et alertes déjà chargées. */
export function buildDashboardKpisFallback(
  stats: DashboardKpisStatsFallback | undefined,
  alerts: Pick<DashboardAlert, "severity" | "type">[],
): KpiSummary {
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
  const overdueServices = alerts.filter((alert) => alert.type === "ct").length;

  return {
    activeVehicles: stats?.activeVehicles ?? 0,
    inMaintenance: stats?.maintenanceInProgress ?? 0,
    criticalAlerts,
    overdueServices,
    deltaCritical: 0,
    deltaActive: 0,
  };
}

/** Normalise la réponse JSONB de la RPC get_kpi_summary. */
export function mapRpcKpiSummary(data: unknown): KpiSummary {
  if (!data || typeof data !== "object") {
    return DASHBOARD_EMPTY_KPIS;
  }

  const row = data as Record<string, unknown>;
  return {
    activeVehicles: Number(row.activeVehicles ?? row.active_vehicles ?? 0),
    inMaintenance: Number(row.inMaintenance ?? row.in_maintenance ?? 0),
    criticalAlerts: Number(row.criticalAlerts ?? row.critical_alerts ?? 0),
    overdueServices: Number(row.overdueServices ?? row.overdue_services ?? 0),
    deltaCritical: Number(row.deltaCritical ?? row.delta_critical ?? 0),
    deltaActive: Number(row.deltaActive ?? row.delta_active ?? 0),
  };
}

export function canFetchDashboardKpis(orgId: string | null, skipRemoteKpis: boolean): boolean {
  return !skipRemoteKpis && !!orgId && isValidUuid(orgId);
}

/**
 * Résout les KPI affichables sans laisser `null` après chargement (évite squelette infini).
 */
export function resolveActionableDashboardKpis(params: {
  orgId: string | null;
  kpisData: KpiSummary | null | undefined;
  isKpisError: boolean;
  skipRemoteKpis: boolean;
  fallbackKpis?: KpiSummary | null;
}): { kpis: KpiSummary; kpisDegraded: boolean } {
  const { orgId, kpisData, isKpisError, skipRemoteKpis, fallbackKpis } = params;

  if (kpisData) {
    return { kpis: kpisData, kpisDegraded: false };
  }

  if (skipRemoteKpis || !orgId || !isValidUuid(orgId)) {
    return { kpis: DASHBOARD_EMPTY_KPIS, kpisDegraded: false };
  }

  if (isKpisError) {
    if (fallbackKpis) {
      return { kpis: fallbackKpis, kpisDegraded: false };
    }
    return { kpis: DASHBOARD_EMPTY_KPIS, kpisDegraded: true };
  }

  return { kpis: DASHBOARD_EMPTY_KPIS, kpisDegraded: false };
}
