export const WHATSAPP_TEMPLATE_NAMES = [
  "maintenance_alert_assigned_fr",
  "maintenance_alert_in_progress_fr",
  "maintenance_alert_resolved_fr",
  "maintenance_alert_action_required_fr",
  "document_expired_assigned_fr",
  "document_expired_in_progress_fr",
  "document_expired_resolved_fr",
  "document_expired_action_required_fr",
] as const;

export type WhatsappTemplateName = (typeof WHATSAPP_TEMPLATE_NAMES)[number];

export function isWhatsappTemplateName(value: string): value is WhatsappTemplateName {
  return (WHATSAPP_TEMPLATE_NAMES as readonly string[]).includes(value);
}
