/** KPIs tableau de bord (format aligné sur les RPC / composants dashboard). */
export interface DashboardKpis {
  total_vehicles: number;
  active_vehicles: number;
  total_drivers: number;
  active_drivers: number;
  expired_docs: number;
  expiring_docs_30d: number;
  expenses_this_month: number;
  km_this_month: number;
  new_alerts: number;
}

export const EMPTY_DASHBOARD_KPIS: DashboardKpis = {
  total_vehicles: 0,
  active_vehicles: 0,
  total_drivers: 0,
  active_drivers: 0,
  expired_docs: 0,
  expiring_docs_30d: 0,
  expenses_this_month: 0,
  km_this_month: 0,
  new_alerts: 0,
};

export interface ExpenseChartRow {
  month: string;
  carburant: number;
  entretien: number;
  assurance: number;
  autres: number;
  montant: number;
}

export interface KmChartRow {
  month: string;
  km: number;
  trajets: number;
}

export interface FuelJournalRow {
  purchased_at: string;
  amount_xof: number;
}

export interface ShiftKmRow {
  km_start: number;
  km_end: number | null;
  ended_at: string | null;
}
