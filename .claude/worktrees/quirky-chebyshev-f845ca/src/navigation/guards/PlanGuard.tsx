import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBilling } from "@/hooks/useBilling";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import type { BillingSnapshot } from "@/services/billing.service";

/**
 * Garde minimale « plan payant » : abonnement actif avec un plan autre que `free`.
 * Les feature flags par module (rapports, IA, etc.) nécessiteront une extension de
 * {@link BillingSnapshot} ou une table `plans` côté API (voir plan d’architecture).
 */
function hasNonFreeActivePlan(snapshot: BillingSnapshot | undefined): boolean {
  const sub = snapshot?.subscription;
  if (!sub?.plan) return false;
  if (sub.status !== "active") return false;
  return sub.plan.code !== "free";
}

interface PlanGuardProps {
  children: ReactNode;
  fallbackTo?: string;
}

export function PlanGuard({
  children,
  fallbackTo = ROUTE_PATHS.upgrade,
}: PlanGuardProps) {
  const { user, orgId, activeTenantContext, isLoading: authLoading } = useAuth();
  const fleetId = activeTenantContext?.fleetId ?? null;
  const canQueryBilling = Boolean(orgId && fleetId);

  const { data: billing, isLoading: billingLoading } = useBilling(
    canQueryBilling ? orgId : null,
    canQueryBilling ? fleetId : null,
  );

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to={ROUTE_PATHS.auth} replace />;
  }

  if (!canQueryBilling) {
    return <Navigate to={ROUTE_PATHS.tenantBootstrap} replace />;
  }

  if (billingLoading) {
    return <PageLoader />;
  }

  if (!hasNonFreeActivePlan(billing)) {
    return <Navigate to={fallbackTo} replace />;
  }

  return <>{children}</>;
}
