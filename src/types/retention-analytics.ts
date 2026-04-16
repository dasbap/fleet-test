/**
 * Types alignés sur les vues SQL `v_retention_*`, `v_daily_active_users`, `v_activation_funnel`.
 *
 * Voir aussi le type `ActivationMetrics` (`activation-metrics.ts`) pour les agrégations
 * **par flotte** (score moyen, taux de preuves, inscriptions récentes) via la RPC
 * `fleet_activation_metrics`.
 */

export interface RetentionKpis {
  org_id: string;
  total_members: number;
  new_d7: number;
  retained_ever_d7: number;
  retained_ever_d30: number;
  active_rolling_7d: number;
  active_rolling_30d: number;
  never_activated: number;
  eligible_d7: number;
  eligible_d30: number;
}

export interface CohortRow {
  org_id: string;
  cohort_week: string;
  cohort_size: number;
  retained_d7: number;
  retained_d30: number;
  pct_d7: string;
  pct_d30: string;
  total_closures_d7: string;
  total_closures_d30: string;
  fleets_in_cohort: number;
}

export interface DauRow {
  org_id: string;
  day: string;
  dau: number;
  active_fleets: number;
  total_sessions: number;
}

export interface FunnelRow {
  org_id: string;
  role: string;
  inscribed: number;
  opened_shift: number;
  closed_shift: number;
  validated_shift: number;
}

export interface RetentionAnalyticsBundle {
  kpis: RetentionKpis;
  cohorts: CohortRow[];
  dau: DauRow[];
  funnel: FunnelRow[];
}
