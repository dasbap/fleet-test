import { Outlet } from "react-router-dom";
import { RequireAuth } from "@/navigation/guards/RequireAuth";

/**
 * Garde d'authentification pour les routes dashboard (délègue à RequireAuth + Outlet).
 */
export function ProtectedRoute() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}
