/**
 * Types — État du compte E-Samba (inspiré Amazon)
 */

// ─── États d'abonnement ───────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'active'          // Abonnement actif, tout va bien
  | 'trialing'        // Essai gratuit en cours
  | 'pending_payment' // Paiement attendu / échec de paiement
  | 'grace_period'    // Retard de paiement, accès temporaire maintenu
  | 'suspended'       // Flotte suspendue (retard > grace_period)
  | 'expired'         // Abonnement expiré, aucun accès
  | 'cancelled';      // Résilié volontairement, accès jusqu'à fin de période

// ─── Plan ─────────────────────────────────────────────────────────────────────

export interface AccountPlan {
  id:           string;
  name:         string; // 'Starter' | 'Standard' | 'Pro'
  max_vehicles: number | null; // null = illimité
  features: {
    qr_premium:    boolean;
    ai_pulse:      boolean;
    dvir:          boolean;
    transit_cemac: boolean;
    export_pdf:    boolean;
  };
}

// ─── Abonnement courant ───────────────────────────────────────────────────────

export interface AccountSubscription {
  id:              string;
  status:          SubscriptionStatus;
  plan:            AccountPlan;
  /** Début de la période en cours */
  period_start:    string;
  /** Fin de la période en cours */
  period_end:      string;
  /** Fin de la période d'essai (si trialing) */
  trial_ends_at:   string | null;
  /** Fin de la période de grâce (si grace_period) */
  grace_ends_at:   string | null;
  /** Montant du prochain paiement en FCFA */
  next_amount:     number | null;
  /** Mode de paiement enregistré */
  payment_method:  string | null;
  /** Dernière tentative de paiement */
  last_payment_at: string | null;
  /** Prochaine date de facturation */
  next_billing_at: string | null;
}

// ─── Métriques flotte ─────────────────────────────────────────────────────────

export interface FleetMetrics {
  total_vehicles:   number;
  active_vehicles:  number;
  max_vehicles:     number | null;
  total_drivers:    number;
  active_drivers:   number;
}

// ─── Contexte global du compte ────────────────────────────────────────────────

export interface AccountStatus {
  subscription:  AccountSubscription | null;
  fleet:         FleetMetrics | null;
  isLoading:     boolean;
  error:         string | null;
  /** Jours restants dans la période en cours */
  daysRemaining: number | null;
  /** Jours restants dans l'essai gratuit */
  trialDaysLeft: number | null;
  /** Compte en bonne santé (actif ou en essai sans problème) */
  isHealthy:     boolean;
  /** Nécessite une action immédiate (paiement, suspension) */
  requiresAction: boolean;
  /** Message d'action prioritaire à afficher */
  actionMessage:  string | null;
}

// ─── Config d'affichage par statut ────────────────────────────────────────────

export interface StatusDisplay {
  label:      string;
  color:      string; // Tailwind class bg-*
  textColor:  string; // Tailwind class text-*
  borderColor: string;
  icon:       string; // nom lucide-react
  urgent:     boolean;
}

export const STATUS_DISPLAY: Record<SubscriptionStatus, StatusDisplay> = {
  active: {
    label:       'Actif',
    color:       'bg-emerald-50',
    textColor:   'text-emerald-700',
    borderColor: 'border-emerald-200',
    icon:        'CheckCircle2',
    urgent:      false,
  },
  trialing: {
    label:       'Essai gratuit',
    color:       'bg-blue-50',
    textColor:   'text-blue-700',
    borderColor: 'border-blue-200',
    icon:        'Sparkles',
    urgent:      false,
  },
  pending_payment: {
    label:       'Paiement en attente',
    color:       'bg-amber-50',
    textColor:   'text-amber-700',
    borderColor: 'border-amber-200',
    icon:        'CreditCard',
    urgent:      true,
  },
  grace_period: {
    label:       'Période de grâce',
    color:       'bg-orange-50',
    textColor:   'text-orange-700',
    borderColor: 'border-orange-200',
    icon:        'Clock',
    urgent:      true,
  },
  suspended: {
    label:       'Suspendu',
    color:       'bg-red-50',
    textColor:   'text-red-700',
    borderColor: 'border-red-200',
    icon:        'Ban',
    urgent:      true,
  },
  expired: {
    label:       'Expiré',
    color:       'bg-gray-50',
    textColor:   'text-gray-600',
    borderColor: 'border-gray-200',
    icon:        'AlertCircle',
    urgent:      true,
  },
  cancelled: {
    label:       'Résilié',
    color:       'bg-gray-50',
    textColor:   'text-gray-600',
    borderColor: 'border-gray-200',
    icon:        'XCircle',
    urgent:      false,
  },
};
