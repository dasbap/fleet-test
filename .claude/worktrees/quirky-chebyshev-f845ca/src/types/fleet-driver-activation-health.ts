/**
 * Réponse JSON de la RPC `fleet_driver_activation_health`.
 */
export interface FleetDriverActivationFlagRow {
  user_id: string;
  has_phone: boolean;
  has_ever_shift: boolean;
}

export interface FleetDriverActivationHealth {
  total_drivers: number;
  with_phone_count: number;
  never_shifted_count: number;
  pct_with_phone: number;
  drivers: FleetDriverActivationFlagRow[];
}
