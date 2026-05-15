import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import { useAuth } from "@/hooks/useAuth";
import {
  SUBSCRIPTION_ACCESS,
  type SubscriptionAccessRule,
} from "@/server/domain/billing/subscriptionLifecycle";
import type { SubscriptionStatus } from "@/types/billing-production";

export type { SubscriptionAccessRule };

export interface SubscriptionAccessState extends SubscriptionAccessRule {
  status: SubscriptionStatus | null;
  isLoading: boolean;
  /** Véhicules actuellement dans la flotte. */
  vehicleCount: number;
  /** Slots achetés selon le plan. */
  vehicleSlots: number;
  /** L'utilisateur peut encore ajouter des véhicules (compte + accès). */
  canAddMoreVehicles: boolean;
  /** Fin d'abonnement ou de trial (ISO string). */
  endsAt: string | null;
  /** Fin de grace period (ISO string). */
  graceUntil: string | null;
}

const FALLBACK_STATUS: SubscriptionStatus = "suspended";

/**
 * Retourne les règles d'accès calculées pour la flotte active de l'utilisateur.
 * Se base sur useFleetBillingContext pour le statut live.
 */
export function useSubscriptionAccess(): SubscriptionAccessState {
  const { userFleetId } = useAuth();
  const billing = useFleetBillingContext(userFleetId ?? undefined);

  if (billing.isLoading || !billing.data) {
    return {
      status: null,
      isLoading: true,
      vehicleCount: 0,
      vehicleSlots: 0,
      canAddMoreVehicles: false,
      endsAt: null,
      graceUntil: null,
      ...SUBSCRIPTION_ACCESS[FALLBACK_STATUS],
    };
  }

  const ctx = billing.data;

  // Mappe BillingStatus → SubscriptionStatus (grace = grace_period dans le type)
  const rawStatus = ctx.billingStatus as string;
  const status: SubscriptionStatus = rawStatus === "grace"
    ? "grace_period"
    : (rawStatus as SubscriptionStatus) ?? FALLBACK_STATUS;

  const rule = SUBSCRIPTION_ACCESS[status] ?? SUBSCRIPTION_ACCESS[FALLBACK_STATUS];

  const effectiveMax = status === "trial"
    ? 3
    : (ctx.maxVehicles ?? Infinity);

  const canAddMoreVehicles =
    rule.canAddVehicles && ctx.vehicleCount < effectiveMax;

  return {
    status,
    isLoading: false,
    vehicleCount: ctx.vehicleCount,
    vehicleSlots: ctx.vehicleSlots,
    canAddMoreVehicles,
    endsAt: ctx.subscriptionEndsAt ?? null,
    graceUntil: ctx.gracePeriodEndsAt ?? null,
    ...rule,
  };
}

/** Version légère pour les guards de feature (sans re-render billing). */
export function useFeatureAccess() {
  const access = useSubscriptionAccess();
  return {
    financeEnabled:   access.status === "active" ? access.premiumFeatures : false,
    aiEnabled:        access.status === "active" ? access.premiumFeatures : false,
    reportsEnabled:   access.status === "active" ? access.premiumFeatures : false,
    terrainEnabled:   access.terrainAccess,
    canAddVehicles:   access.canAddMoreVehicles,
    isReadOnly:       access.isReadOnly,
    needsUpgrade:     access.needsUpgrade,
  };
}
