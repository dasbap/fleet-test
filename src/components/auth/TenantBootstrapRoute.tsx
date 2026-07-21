import { Navigate } from "react-router-dom";
import { RequireAuth } from "@/navigation/guards/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import CreateFleet from "@/pages/CreateFleet";
import { PageLoader } from "@/components/dashboard/PageLoader";

export function TenantBootstrapRoute() {
  const { memberships, activeTenantContext, isTenantOrgLoading } = useAuth();
  const { isAdmin, isLoading: isRoleAccessLoading } = useRoleAccess();

  return (
    <RequireAuth>
      {isRoleAccessLoading ? (
        <PageLoader />
      ) : isAdmin ? (
        <Navigate to={ROUTE_PATHS.dashboardAdmin} replace />
      ) : memberships.length > 0 && activeTenantContext ? (
        <Navigate to="/dashboard" replace />
      ) : memberships.length > 0 && !activeTenantContext && isTenantOrgLoading ? (
        <PageLoader />
      ) : (
        <CreateFleet />
      )}
    </RequireAuth>
  );
}
