import type { DashboardKpis } from "./types";

interface SnapshotStats {
  activeVehicles?: number;
  totalVehicles?: number;
  activeDrivers?: number;
  totalDrivers?: number;
  maintenanceInProgress?: number;
}

interface SnapshotKpis {
  criticalAlerts?: number;
  activeVehicles?: number;
}

/** Agrège snapshot RPC + métriques calculées en KPIs dashboard. */
export function mapSnapshotToDashboardKpis(params: {
  stats: SnapshotStats;
  kpis: SnapshotKpis;
  expiredDocs: number;
  expiringDocs30d: number;
  expensesThisMonth: number;
  kmThisMonth: number;
}): DashboardKpis {
  const {
    stats,
    kpis,
    expiredDocs,
    expiringDocs30d,
    expensesThisMonth,
    kmThisMonth,
  } = params;

  return {
    total_vehicles: stats.totalVehicles ?? 0,
    active_vehicles: stats.activeVehicles ?? kpis.activeVehicles ?? 0,
    total_drivers: stats.totalDrivers ?? 0,
    active_drivers: stats.activeDrivers ?? 0,
    expired_docs: expiredDocs,
    expiring_docs_30d: expiringDocs30d,
    expenses_this_month: expensesThisMonth,
    km_this_month: kmThisMonth,
    new_alerts: kpis.criticalAlerts ?? 0,
  };
}
