/**
 * Module Alertes / incidents priorisés Flotte E-Samba (workflow métier).
 * Distinct du modèle `Alert` générique (`types/alert.ts`).
 */

/** Types d’alerte métier. */
export type IncidentAlertKind =
  | "maintenance_due"
  | "document_expired"
  | "breakdown_reported"
  | "long_immobilization"
  | "mileage_exceeded"
  | "technical_feedback"
  | "mission_anomaly";

/** Gravité affichée et filtrable. */
export type IncidentAlertSeverity = "basse" | "moyenne" | "haute" | "critique";

/** Statut de traitement (workflow). */
export type IncidentWorkflowStatus = "NOUVEAU" | "EN_COURS" | "RESOLU";

export interface IncidentAlertAssignee {
  id: string;
  fullName: string;
  role: string;
  phone?: string;
}

export interface IncidentAlertComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface IncidentHistoryEntry {
  id: string;
  at: string;
  label: string;
}

/** Pièce jointe simulée (aperçu métadonnées). */
export interface IncidentAttachmentSimulated {
  id: string;
  fileName: string;
  mimeType: string;
  sizeLabel: string;
  uploadedAt: string;
  /** Aperçu local (Capacitor webPath / data URL) — non synchronisé serveur. */
  localPreviewUrl?: string;
}

/** Ligne liste. */
export interface FleetIncidentAlertListItem {
  id: string;
  title: string;
  kind: IncidentAlertKind;
  /** Texte court véhicule (immat. + modèle). */
  vehicleLabel: string;
  severity: IncidentAlertSeverity;
  status: IncidentWorkflowStatus;
  createdAt: string;
  assignee: IncidentAlertAssignee | null;
}

/** Fiche détail (étend la liste). */
export interface FleetIncidentAlertDetail extends FleetIncidentAlertListItem {
  fleetId: string;
  vehicleId: string | null;
  description: string;
  updatedAt: string;
  comments: IncidentAlertComment[];
  history: IncidentHistoryEntry[];
  attachments: IncidentAttachmentSimulated[];
  /** Conducteur lié à l’incident (appel). */
  driverContact?: { name: string; phone: string };
  /** Technicien / atelier (appel). */
  technicianContact?: { name: string; phone: string };
}

export type IncidentSeverityFilter = "all" | IncidentAlertSeverity;
export type IncidentStatusFilter = "all" | IncidentWorkflowStatus;
