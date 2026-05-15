/**
 * Types billing production E-Samba.
 * Source de vérité alignée avec les migrations Supabase.
 */

// ─── Statuts abonnement ────────────────────────────────────

export const SUBSCRIPTION_STATUSES = [
  "trial",           // période d'essai gratuite
  "pending_payment", // paiement initié, en attente de confirmation webhook
  "active",          // abonnement actif (paiement confirmé)
  "grace_period",    // abonnement expiré mais service maintenu (grâce)
  "suspended",       // accès coupé (grâce expirée)
  "expired",         // fin naturelle sans renouvellement
  "cancelled",       // résiliation manuelle
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const ACTIVE_SUBSCRIPTION_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  "trial",
  "active",
  "grace_period",
]);

export function isSubscriptionAccessible(status: SubscriptionStatus): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(status);
}

// ─── Statuts paiement ──────────────────────────────────────

export const PAYMENT_STATUSES_V2 = [
  "initiated",   // paiement créé, URL de checkout générée
  "processing",  // PSP a pris en charge la demande
  "successful",  // paiement confirmé par webhook PSP
  "failed",      // paiement échoué (refus, timeout…)
  "cancelled",   // annulé avant complétion
  "refunded",    // remboursé après succès
] as const;

export type PaymentStatusV2 = (typeof PAYMENT_STATUSES_V2)[number];

export const TERMINAL_PAYMENT_STATUSES: ReadonlySet<PaymentStatusV2> = new Set([
  "successful",
  "failed",
  "cancelled",
  "refunded",
]);

// ─── Providers de paiement ─────────────────────────────────

export const PAYMENT_PROVIDERS = [
  "notch",        // Notch Pay (Mobile Money Cameroun/Afrique)
  "orange_money", // Orange Money direct (flux manuel)
  "mtn_momo",     // MTN MoMo direct (flux manuel)
  "stripe",       // Stripe (cartes internationales, futur)
  "manual",       // Confirmation manuelle support
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

// ─── Entités base ──────────────────────────────────────────

export interface BillingPlan {
  id: string;
  code: "free" | "starter" | "pro" | "enterprise";
  name: string;
  price_per_vehicle: number; // XAF par véhicule par mois
  max_vehicles: number | null; // NULL = illimité
  min_commitment_days: number;
  is_active: boolean;
  // Feature flags
  enables_finance: boolean;
  enables_ai: boolean;
  enables_reports: boolean;
  enables_driver_scoring: boolean;
  enables_anomaly_insights: boolean;
}

export interface BillingSubscription {
  id: string;
  fleet_id: string;
  plan_id: string;
  payment_id: string | null;
  status: SubscriptionStatus;
  starts_at: string;
  ends_at: string;
  grace_until: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

export interface BillingPayment {
  id: string;
  org_id: string;
  fleet_id?: string; // extrait du raw_payload
  provider: PaymentProvider;
  provider_reference: string | null; // référence PSP (ex: pay_xxx Notch Pay)
  amount: number; // XAF
  currency: "XAF";
  status: string; // valeurs DB (historique + nouvelles)
  external_ref: string; // référence interne ESAMBA-xxx
  idempotency_key: string;
  raw_payload: BillingPaymentRawPayload | null;
  created_at: string;
  updated_at?: string;
}

export interface BillingPaymentRawPayload {
  planCode: string;
  vehicleCount: number;
  durationMonths: number;
  fleetId: string;
  phoneNumber?: string;
  vehicleIds?: string[];
  notchRef?: string;
}

export interface PaymentAttempt {
  id: string;
  payment_id: string;
  provider: PaymentProvider;
  /** Référence unique côté PSP — idempotence stricte. */
  provider_reference: string | null;
  status: PaymentStatusV2;
  raw_payload: Record<string, unknown> | null;
  raw_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleLicense {
  id: string;
  vehicle_id: string;
  subscription_id: string;
  active: boolean;
  status: "active" | "expired" | "revoked";
  is_premium: boolean;
  starts_at: string;
  ends_at: string;
}

// ─── Billing events ────────────────────────────────────────

export const BILLING_EVENT_TYPES = [
  "payment.initiated",
  "payment.processing",
  "payment.successful",
  "payment.failed",
  "payment.cancelled",
  "payment.refunded",
  "subscription.activated",
  "subscription.renewed",
  "subscription.cancelled",
  "subscription.grace_period_started",
  "subscription.suspended",
  "subscription.expired",
  "vehicle_license.created",
  "vehicle_license.revoked",
  "webhook.received",
  "webhook.duplicate_ignored",
  "webhook.signature_failed",
] as const;

export type BillingEventType = (typeof BILLING_EVENT_TYPES)[number];

export interface BillingEvent {
  id: string;
  fleet_id: string;
  subscription_id: string | null;
  payment_id: string | null;
  event_type: BillingEventType;
  payload: Record<string, unknown>;
  created_at: string;
}

// ─── Contexte de facturation flotte ───────────────────────

export interface FleetBillingContext {
  planCode: BillingPlan["code"];
  isPaid: boolean;
  vehicleCount: number;
  activeVehicles: number;
  vehicleSlots: number;
  maxVehicles: number;
  billingStatus: SubscriptionStatus | "enterprise";
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  gracePeriodEndsAt: string | null;
  // Feature flags
  financeEnabled: boolean;
  aiEnabled: boolean;
  reportsEnabled: boolean;
  driverScoringEnabled: boolean;
  anomalyInsightsEnabled: boolean;
  geofencingEnabled: boolean;
  scheduledReportsEnabled: boolean;
  offlineDriverEnabled: boolean;
}

// ─── Résultat webhook ──────────────────────────────────────

export interface WebhookProcessResult {
  paymentId: string;
  providerReference: string;
  normalizedStatus: PaymentStatusV2;
  subscriptionActivated: boolean;
  subscriptionId?: string;
  vehicleLicensesCreated: number;
  billingEventId?: string;
  skippedReason?: "already_processed" | "no_transition" | "invalid_payload";
}
