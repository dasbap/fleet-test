/**
 * Métriques d'activation et qualité au niveau **flotte** (RPC `fleet_activation_metrics`).
 *
 * Distinct de {@link FunnelRow} dans `retention-analytics` : le funnel est agrégé par
 * **organisation** et par **rôle** (`inscribed`, `opened_shift`, etc.), sans moyenne de score
 * ni taux de preuves détaillé par flotte.
 */
export interface ActivationMetrics {
  /** Nouvelles adhésions conducteur sur la flotte (30 jours glissants). */
  signupCount: number;
  /** Conducteurs inscrits sur 30j ayant une activité (créneau ou clôture) dans les 24h suivant l'adhésion. */
  activatedDay1: number;
  /** Idem fenêtre 7 jours après l'adhésion. */
  activatedDay7: number;
  /** Moyenne de clôtures par jour sur 7j, rapportée aux conducteurs actifs sur 7j (ratio sans dimension). */
  dailyClosureRate: number;
  /** Pourcentage de clôtures avec preuve non vide (30j). */
  proofSubmissionRate: number;
  /** Membres conducteur désactivés sur la flotte. */
  blockedDriversCount: number;
  /** Moyenne des `score_total` dans `scores_conducteurs` pour la flotte. */
  averageDriverScore: number;
}
