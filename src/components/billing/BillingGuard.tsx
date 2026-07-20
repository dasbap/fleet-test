import { Navigate } from "react-router-dom";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";
import type { BillingStatus } from "@/types/fleet-billing";

interface BillingGuardProps {
  /** Statuts autorisés à accéder. Par défaut tout sauf 'suspended'. */
  allowStatuses?: BillingStatus[];
  /** Où rediriger si bloqué. */
  redirectTo?: string;
  children: ReactNode;
}

/**
 * Bloque l'accès aux routes si la flotte est suspendue.
 * En période de grâce : laisse passer mais le BillingBanner avertit.
 */
export function BillingGuard({
  allowStatuses = ["trial", "active", "grace", "enterprise"],
  redirectTo = "/dashboard/billing",
  children,
}: BillingGuardProps) {
  const { userFleetId } = useAuth();
  const billing = useFleetBillingContext(userFleetId ?? undefined);

  // Pendant le chargement : laisser passer (évite un flash de redirect)
  if (billing.isLoading || billing.isError) return <>{children}</>;

  const status = billing.data?.billingStatus ?? "trial";

  if (!allowStatuses.includes(status)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
