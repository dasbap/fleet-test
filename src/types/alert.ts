/**
 * Alerte opérationnelle (pannes, seuils, incidents signalés).
 */
export type AlertSeverity = "info" | "warning" | "critical";

export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface Alert {
  id: string;
  fleetId: string;
  vehicleId: string | null;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AlertFilters {
  fleetId?: string;
  status?: AlertStatus;
  severity?: AlertSeverity;
}
