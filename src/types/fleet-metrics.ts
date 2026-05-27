/** Métriques dashboard flotte 30j (RPC `get_fleet_dashboard_metrics`). */
export interface FleetMetrics {
  fleet_id: string;
  period: string;
  total_shifts: number;
  closed_shifts: number;
  closure_rate: number;
  revenue_gap: number;
  avg_closure_delay: number;
  incident_count: number;
  active_drivers: number;
  computed_at: string;
  from_cache: boolean;
}

export const EMPTY_FLEET_METRICS: FleetMetrics = {
  fleet_id: '',
  period: '30d',
  total_shifts: 0,
  closed_shifts: 0,
  closure_rate: 0,
  revenue_gap: 0,
  avg_closure_delay: 0,
  incident_count: 0,
  active_drivers: 0,
  computed_at: '',
  from_cache: false,
};
