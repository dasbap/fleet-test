import type { IncidentAlertKind, IncidentAlertSeverity } from "@/types/incident-alert";

export const INCIDENT_KIND_LABELS: Record<IncidentAlertKind, string> = {
  maintenance_due: "Entretien à échéance",
  document_expired: "Document expiré",
  breakdown_reported: "Panne signalée",
  long_immobilization: "Immobilisation longue",
  mileage_exceeded: "Dépassement kilométrique",
  technical_feedback: "Remontée technique",
  mission_anomaly: "Anomalie sur mission",
};

export const INCIDENT_SEVERITY_LABELS: Record<IncidentAlertSeverity, string> = {
  basse: "Basse",
  moyenne: "Moyenne",
  haute: "Haute",
  critique: "Critique",
};
