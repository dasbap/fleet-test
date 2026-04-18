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
