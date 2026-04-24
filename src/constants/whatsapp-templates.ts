export const WHATSAPP_TEMPLATE_NAMES = [
  // ── Notifications one-way (alertes opérationnelles) ───────────────────────
  "maintenance_alert_assigned_fr",
  "maintenance_alert_in_progress_fr",
  "maintenance_alert_resolved_fr",
  "maintenance_alert_action_required_fr",
  "document_expired_assigned_fr",
  "document_expired_in_progress_fr",
  "document_expired_resolved_fr",
  "document_expired_action_required_fr",

  // ── Templates interactifs conducteur (boutons CTA / quick reply) ─────────
  /** Rappel quotidien d'ouverture de créneau (bouton CTA → lien terrain). */
  "shift_open_reminder_cta_fr",
  /** Rappel de clôture journalière (quick reply : Clôturer / Plus tard). */
  "shift_close_reminder_qr_fr",
  /** Confirmation saisie carburant (quick reply : Confirmer / Corriger). */
  "fuel_entry_confirm_qr_fr",
  /** Alerte document expirant — demande d'action rapide (quick reply : J'ai renouvelé / En cours). */
  "doc_expiry_action_qr_fr",
  /** Notification score conducteur (informatif + lien vers dashboard). */
  "driver_score_update_cta_fr",
  /** Invitation à compléter le profil conducteur (quick reply : Compléter / Plus tard). */
  "driver_profile_complete_qr_fr",
] as const;

export type WhatsappTemplateName = (typeof WHATSAPP_TEMPLATE_NAMES)[number];

/**
 * Catégories de templates pour l'interface d'administration.
 */
export const TEMPLATE_CATEGORIES: Record<WhatsappTemplateName, "notification" | "interactive"> = {
  maintenance_alert_assigned_fr: "notification",
  maintenance_alert_in_progress_fr: "notification",
  maintenance_alert_resolved_fr: "notification",
  maintenance_alert_action_required_fr: "notification",
  document_expired_assigned_fr: "notification",
  document_expired_in_progress_fr: "notification",
  document_expired_resolved_fr: "notification",
  document_expired_action_required_fr: "notification",
  shift_open_reminder_cta_fr: "interactive",
  shift_close_reminder_qr_fr: "interactive",
  fuel_entry_confirm_qr_fr: "interactive",
  doc_expiry_action_qr_fr: "interactive",
  driver_score_update_cta_fr: "interactive",
  driver_profile_complete_qr_fr: "interactive",
};

/**
 * Composants boutons pour les templates interactifs (structure Meta WhatsApp Cloud API).
 * Chaque entrée contient les boutons à passer dans `components` lors de l'envoi.
 */
export type WaButton =
  | { type: "QUICK_REPLY"; text: string }
  | { type: "URL"; text: string; url: string }
  | { type: "PHONE_NUMBER"; text: string; phone_number: string };

export const INTERACTIVE_TEMPLATE_BUTTONS: Partial<Record<WhatsappTemplateName, WaButton[]>> = {
  shift_open_reminder_cta_fr: [
    { type: "URL", text: "Ouvrir le créneau", url: "https://app.e-samba.com/terrain" },
  ],
  shift_close_reminder_qr_fr: [
    { type: "QUICK_REPLY", text: "Clôturer maintenant" },
    { type: "QUICK_REPLY", text: "Dans 1 heure" },
  ],
  fuel_entry_confirm_qr_fr: [
    { type: "QUICK_REPLY", text: "Confirmer" },
    { type: "QUICK_REPLY", text: "Corriger" },
  ],
  doc_expiry_action_qr_fr: [
    { type: "QUICK_REPLY", text: "Renouvelé ✓" },
    { type: "QUICK_REPLY", text: "En cours" },
    { type: "QUICK_REPLY", text: "Besoin d'aide" },
  ],
  driver_score_update_cta_fr: [
    { type: "URL", text: "Voir mon score", url: "https://app.e-samba.com/dashboard/drivers/scores" },
  ],
  driver_profile_complete_qr_fr: [
    { type: "QUICK_REPLY", text: "Compléter" },
    { type: "QUICK_REPLY", text: "Plus tard" },
  ],
};
