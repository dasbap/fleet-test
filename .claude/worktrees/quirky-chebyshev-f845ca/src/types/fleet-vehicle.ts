/**
 * Module Flotte E-Samba — véhicules (liste, détail, filtres, timeline).
 */

/** État opérationnel pour les filtres liste. */
export type FleetVehicleAvailability =
  | "available"
  | "on_mission"
  | "stopped"
  | "maintenance";

export type FleetVehicleTimelineEventType =
  | "alert"
  | "maintenance"
  | "mission"
  | "location"
  | "assignment"
  | "document"
  | "other";

/** Ligne liste (synthèse). */
export interface FleetVehicleListItem {
  id: string;
  registration: string;
  /** Type de véhicule (ex. fourgon, VL). */
  vehicleType: string;
  brand: string;
  model: string;
  availability: FleetVehicleAvailability;
  /** Libellé court pour badge / accessibilité. */
  statusLabel: string;
  nextMaintenanceAt: string;
  lastKnownLocation: string;
  openAlertsCount: number;
}

/** Document avec échéance à surveiller. */
export interface FleetVehicleDocumentExpiry {
  id: string;
  label: string;
  expiryDate: string;
}

/** Entrée d’historique d’entretien. */
export interface FleetVehicleMaintenanceEntry {
  id: string;
  date: string;
  label: string;
  km: number;
  provider?: string;
}

/** Événement pour la timeline. */
export interface FleetVehicleTimelineEvent {
  id: string;
  at: string;
  type: FleetVehicleTimelineEventType;
  title: string;
  description?: string;
}

/** Conducteur affecté. */
export interface FleetVehicleAssignedDriver {
  id: string;
  fullName: string;
  phone?: string;
}

/** Fiche détail (étend la liste + champs étendus). */
export interface FleetVehicleDetail extends FleetVehicleListItem {
  currentKm: number;
  /** Localisation détaillée (fiche). */
  locationLabel: string;
  locationUpdatedAt: string;
  coordinates?: { lat: number; lng: number };
  documentsExpiringSoon: FleetVehicleDocumentExpiry[];
  maintenanceHistory: FleetVehicleMaintenanceEntry[];
  timeline: FleetVehicleTimelineEvent[];
  assignedDriver: FleetVehicleAssignedDriver | null;
}

export type FleetVehicleFilterTab =
  | "all"
  | FleetVehicleAvailability;
