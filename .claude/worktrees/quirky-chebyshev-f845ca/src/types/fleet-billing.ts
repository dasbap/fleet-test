/**
 * Contexte facturation / droits applicatifs pour une flotte.
 *
 * Source de vérité : RPC `get_fleet_billing_context` (hybride).
 * - Abonnement actif + ligne `plans` si présent.
 * - Sinon plan implicite `free` : 3 véhicules max, finance et IA désactivés.
 */
export interface FleetBillingContext {
  /** Code plan (`free`, `starter`, etc.). */
  planCode: string;
  /** True si un abonnement actif non-free est en place. */
  isPaid: boolean;
  /** Nombre de véhicules enregistrés sur la flotte. */
  vehicleCount: number;
  /** Plafond véhicules (grand nombre = illimité côté métier). */
  maxVehicles: number;
  /** Accès module finances / encaissements. */
  financeEnabled: boolean;
  /** Accès fonctionnalités d’assistance type IA (UI). */
  aiEnabled: boolean;
  /** Rapports d’activité / exports analytiques. */
  reportsEnabled: boolean;
  /** Scoring conducteur (affichage et calcul côté serveur). */
  driverScoringEnabled: boolean;
  /** Analyse d’anomalies et alertes automatiques associées. */
  anomalyInsightsEnabled: boolean;
}
