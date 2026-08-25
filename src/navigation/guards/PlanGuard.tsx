import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFleetSiteAccess } from "@/hooks/useFleetSiteAccess";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { ROUTE_PATHS } from "@/navigation/routePaths";

function isNotchPaymentReturn(pathname: string, search: string): boolean {
  if (pathname !== ROUTE_PATHS.dashboardBilling) return false;
  const params = new URLSearchParams(search);
  const status = params.get("status")?.toLowerCase();
  return status === "success" || status === "complete";
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
  const location = useLocation();
  const fleetId = activeTenantContext?.fleetId ?? null;
  const canQueryAccess = Boolean(orgId && fleetId);

  const {
    data: hasSiteAccess,
    isLoading: accessLoading,
  } = useFleetSiteAccess(canQueryAccess ? fleetId : null);

  if (authLoading) return <PageLoader />;
  if (!user) return <Navigate to={ROUTE_PATHS.auth} replace />;
  if (!canQueryAccess) return <Navigate to={ROUTE_PATHS.tenantBootstrap} replace />;
  if (isNotchPaymentReturn(location.pathname, location.search)) return <>{children}</>;
  if (accessLoading) return <PageLoader />;
  if (!hasSiteAccess) return <Navigate to={fallbackTo} replace />;

  return <>{children}</>;
}
