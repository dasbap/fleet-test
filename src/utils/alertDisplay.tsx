import React from "react";
import { Bell, AlertTriangle, Car, User, Calendar } from "lucide-react";
import type { AlertType, AlertSeverity } from "@/hooks/useAlerts";

/** Libellés des types d’alerte (alignés sur le schéma alert_type). */
export const alertTypeLabels: Record<AlertType, string> = {
  missing_closure: "Clôture manquante",
  recurring_gap: "Écart récurrent",
  risky_driver: "Chauffeur à risque",
  vehicle_blocked: "Véhicule bloqué",
  maintenance_due: "Maintenance requise",
  document_expired: "Document expire",
  failure_risk: "Risque de panne",
  speeding: "Exces de vitesse",
  geofence_enter: "Entree de zone",
  geofence_exit: "Sortie de zone",
  faq_answer: "Reponse FAQ",
};

/** Libellés des sévérités. */
export const severityLabels: Record<AlertSeverity, string> = {
  critical: "Critique",
  high: "Élevée",
  medium: "Moyenne",
  low: "Faible",
};

/** Retourne l’icône associée au type d’alerte. */
export function getAlertTypeIcon(type: AlertType): React.ReactNode {
  switch (type) {
    case "missing_closure":
      return <Calendar className="h-4 w-4" />;
    case "recurring_gap":
      return <AlertTriangle className="h-4 w-4" />;
    case "risky_driver":
      return <User className="h-4 w-4" />;
    case "vehicle_blocked":
      return <Car className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

/** Retourne la variante de Badge selon la sévérité. */
export function getSeverityColor(
  severity: AlertSeverity
): "destructive" | "default" | "secondary" {
  switch (severity) {
    case "critical":
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
    default:
      return "default";
  }
}
