/**
 * DTO persistance — alertes automatiques (`alertes_automatiques`).
 * Distinct du modèle domaine `Alert` dans `@/types/alert`.
 */

export type OperationalAlertSeverityDto = "critical" | "high" | "medium" | "low";

export type OperationalAlertTypeDto =
  | "missing_closure"
  | "recurring_gap"
  | "risky_driver"
  | "vehicle_blocked"
  | "maintenance_due"
  | "document_expired"
  | "failure_risk"
  | "geofence_exit"
  | "faq_answer";

export type IncidentWorkflowStatusDto = "NOUVEAU" | "EN_COURS" | "RESOLU";

export interface AlertDto {
  id: string;
  fleet_id: string;
  alert_type: OperationalAlertTypeDto;
  driver_user_id: string | null;
  vehicle_id: string | null;
  shift_id: string | null;
  severity: OperationalAlertSeverityDto;
  message: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  status: IncidentWorkflowStatusDto;
  assignee_user_id: string | null;
  assigned_at: string | null;
  status_updated_at: string | null;
  recipient_user_id?: string | null;
  faq_question_id?: string | null;
}
