import type { AlertDto } from "@/types/dto/alert.dto";
import type { DashboardAlert } from "@/types/dashboard";
import type { WhatsappTemplateName } from "@/constants/whatsapp-templates";

const ALERT_TEMPLATE_MAP: Record<string, Partial<Record<string, WhatsappTemplateName>>> = {
  maintenance_due: {
    assigned: "maintenance_alert_assigned_fr",
    resolved: "maintenance_alert_resolved_fr",
    status_en_cours: "maintenance_alert_in_progress_fr",
    status_resolu: "maintenance_alert_resolved_fr",
  },
  document_expired: {
    assigned: "document_expired_assigned_fr",
    resolved: "document_expired_resolved_fr",
    status_en_cours: "document_expired_in_progress_fr",
    status_resolu: "document_expired_resolved_fr",
  },
};

const DASHBOARD_ACTION_TEMPLATE_MAP: Partial<
  Record<DashboardAlert["action"]["kind"], WhatsappTemplateName>
> = {
  schedule: "maintenance_alert_action_required_fr",
  plan: "maintenance_alert_action_required_fr",
  book: "maintenance_alert_action_required_fr",
  order: "maintenance_alert_action_required_fr",
  immobilize: "document_expired_action_required_fr",
};

export function getAlertWhatsappTemplate(
  alertType: AlertDto["alert_type"],
  eventKey: string,
): WhatsappTemplateName | null {
  return ALERT_TEMPLATE_MAP[alertType]?.[eventKey] ?? null;
}

export function getDashboardWhatsappTemplate(
  actionKind: DashboardAlert["action"]["kind"],
): WhatsappTemplateName | null {
  return DASHBOARD_ACTION_TEMPLATE_MAP[actionKind] ?? null;
}

/**
 * Templates interactifs déclenchés par des événements conducteur.
 */
export type DriverBotEvent =
  | "shift_open_reminder"
  | "shift_close_reminder"
  | "fuel_confirm"
  | "doc_expiry_action"
  | "score_update"
  | "profile_complete";

const DRIVER_BOT_TEMPLATE_MAP: Record<DriverBotEvent, WhatsappTemplateName> = {
  shift_open_reminder: "shift_open_reminder_cta_fr",
  shift_close_reminder: "shift_close_reminder_qr_fr",
  fuel_confirm: "fuel_entry_confirm_qr_fr",
  doc_expiry_action: "doc_expiry_action_qr_fr",
  score_update: "driver_score_update_cta_fr",
  profile_complete: "driver_profile_complete_qr_fr",
};

export function getDriverBotTemplate(event: DriverBotEvent): WhatsappTemplateName {
  return DRIVER_BOT_TEMPLATE_MAP[event];
}
