/**
 * Contexte facturation / droits applicatifs pour une flotte.
 * Source de vérité : RPC `get_fleet_billing_context`.
 */
export type BillingStatus = 'trial' | 'active' | 'grace' | 'suspended' | 'enterprise';

export interface FleetBillingContext {
  /** Code plan (`free`, `starter`, `pro`, `enterprise`). */
  planCode: string;
  planName: string;
  /** True si abonnement actif non-free. */
  isPaid: boolean;

  // ── Véhicules ──────────────────────────────────────────────
  /** Nombre de véhicules enregistrés. */
  vehicleCount: number;
  /** Véhicules avec billing_status = 'active'. */
  activeVehicles: number;
  /** Licences achetées dans l'abonnement en cours. */
  vehicleSlots: number;
  /** Plafond absolu du plan (999999 = illimité). */
  maxVehicles: number;

  // ── État facturation ────────────────────────────────────────
  billingStatus: BillingStatus;
  /** Date d'expiration du trial (plan free). */
  trialEndsAt: string | null;
  /** Date de fin de l'abonnement payant. */
  subscriptionEndsAt: string | null;
  /** Date limite de la période de grâce (7j après expiration). */
  graceUntil: string | null;

  // ── Features plan ───────────────────────────────────────────
  financeEnabled: boolean;
  aiEnabled: boolean;
  reportsEnabled: boolean;
  driverScoringEnabled: boolean;
  anomalyInsightsEnabled: boolean;
  geofencingEnabled: boolean;
  scheduledReportsEnabled: boolean;
  offlineDriverEnabled: boolean;
}
