import { Navigate } from "react-router-dom";
import { RequireAuth } from "@/navigation/guards/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import CreateFleet from "@/pages/CreateFleet";

export function TenantBootstrapRoute() {
  const { memberships, activeTenantContext } = useAuth();

  return (
    <RequireAuth>
      {memberships.length > 0 && activeTenantContext ? (
        <Navigate to="/dashboard" replace />
      ) : (
        <CreateFleet />
      )}
    </RequireAuth>
  );
}
