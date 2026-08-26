import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFleetSiteAccess } from "@/hooks/useFleetSiteAccess";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { ROUTE_PATHS } from "@/navigation/routePaths";

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
  const canQueryAccess = Boolean(orgId && fleetId);

  const {
    data: hasSiteAccess,
    isLoading: accessLoading,
    isError: accessError,
    refetch: refetchAccess,
  } = useFleetSiteAccess(canQueryAccess ? fleetId : null);

  if (authLoading) return <PageLoader />;
  if (!user) return <Navigate to={ROUTE_PATHS.auth} replace />;
  if (!canQueryAccess) return <Navigate to={ROUTE_PATHS.tenantBootstrap} replace />;
  if (accessLoading) return <PageLoader />;

  if (accessError) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p role="alert">Impossible de vérifier l’accès à cette flotte.</p>
        <button
          type="button"
          className="rounded-md border px-4 py-2"
          onClick={() => void refetchAccess()}
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (hasSiteAccess === false) return <Navigate to={fallbackTo} replace />;
  if (hasSiteAccess !== true) return <PageLoader />;

  return <>{children}</>;
}
