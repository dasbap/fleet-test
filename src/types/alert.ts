/**
 * Alerte opérationnelle (pannes, seuils, incidents signalés).
 */
export type AlertSeverity = "info" | "warning" | "critical";

/**
 * Type fonctionnel d’alerte opérationnelle.
 * Aligné sur `OperationalAlertTypeDto` (voir `@/types/dto/alert.dto`).
 */
export type AlertType =
  | "missing_closure"
  | "recurring_gap"
  | "risky_driver"
  | "vehicle_blocked"
  | "maintenance_due"
  | "document_expired"
  | "failure_risk"
  | "geofence_exit";

export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface Alert {
  id: string;
  fleetId: string;
  vehicleId: string | null;
  /** Type métier de l’alerte (catégorie fonctionnelle). */
  type: AlertType;
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
  /** Filtre par type fonctionnel. */
  type?: AlertType;
  status?: AlertStatus;
  severity?: AlertSeverity;
  /** Recherche plein texte simple (titre / message). */
  search?: string;
}
