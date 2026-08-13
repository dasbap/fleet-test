import type { ReactNode } from "react";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import { useVehiclePlanAccess } from "@/hooks/usePlanAccess";
import { useAuth } from "@/hooks/useAuth";
import type { FleetBillingContext } from "@/types/fleet-billing";

type FeatureKey = keyof Pick<
  FleetBillingContext,
  | "financeEnabled"
  | "aiEnabled"
  | "reportsEnabled"
  | "driverScoringEnabled"
  | "anomalyInsightsEnabled"
  | "geofencingEnabled"
  | "scheduledReportsEnabled"
  | "offlineDriverEnabled"
>;

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Entreprise",
};

const FEATURE_REQUIRED_PLAN: Partial<Record<FeatureKey, string>> = {
  geofencingEnabled:        "pro",
  scheduledReportsEnabled:  "pro",
  financeEnabled:           "starter",
  reportsEnabled:           "starter",
  driverScoringEnabled:     "starter",
};

interface FeatureGuardProps {
  feature: FeatureKey;
  vehicleId?: string;
  /** Rendu alternatif si la feature est inaccessible. Si absent : null. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Affiche `children` uniquement si la feature est activée sur le plan de la flotte.
 * Sinon affiche `fallback` (ou un prompt d'upgrade par défaut).
 */
export function FeatureGuard({ feature, vehicleId, fallback, children }: FeatureGuardProps) {
  const { userFleetId } = useAuth();
  const billing = useFleetBillingContext(userFleetId ?? undefined);
  const vehicleBilling = useVehiclePlanAccess(userFleetId ?? undefined, vehicleId);

  if (vehicleId ? vehicleBilling.isLoading : billing.isLoading) return null;

  const enabled = vehicleId
    ? vehicleBilling.billingCtx?.[feature] ?? false
    : billing.data?.[feature] ?? false;
  if (enabled) return <>{children}</>;

  if (fallback !== undefined) return <>{fallback}</>;

  const requiredPlan = FEATURE_REQUIRED_PLAN[feature];
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
      <span className="text-2xl">🔒</span>
      <p className="font-medium text-foreground">
        Fonctionnalité réservée au plan{" "}
        <span className="text-primary">
          {requiredPlan ? PLAN_LABEL[requiredPlan] ?? requiredPlan : "payant"}
        </span>
      </p>
      <p className="text-sm text-muted-foreground">
        Mettez à jour votre abonnement pour débloquer cette fonctionnalité.
      </p>
      <a
        href="/dashboard/billing"
        className="mt-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Voir les plans
      </a>
    </div>
  );
}
