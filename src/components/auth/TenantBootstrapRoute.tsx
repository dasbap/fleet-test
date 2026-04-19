import { Navigate } from "react-router-dom";
import { RequireAuth } from "@/navigation/guards/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import CreateFleet from "@/pages/CreateFleet";
import { PageLoader } from "@/components/dashboard/PageLoader";

export function TenantBootstrapRoute() {
  const { memberships, activeTenantContext, isTenantOrgLoading } = useAuth();

  return (
    <RequireAuth>
      {memberships.length > 0 && activeTenantContext ? (
        <Navigate to="/dashboard" replace />
      ) : memberships.length > 0 && !activeTenantContext && isTenantOrgLoading ? (
        <PageLoader />
      ) : (
        <CreateFleet />
      )}
    </RequireAuth>
  );
}
