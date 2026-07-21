import { Navigate, Outlet, useLocation } from "react-router-dom";
import { RequireAuth } from "@/navigation/guards/RequireAuth";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useRouteAccess } from "@/hooks/useRouteAccess";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/types/auth";
import { getLoginPathPreservingReturn } from "@/navigation/loginRedirectPath";
import { ROUTE_PATHS } from "@/navigation/routePaths";

export interface ProtectedRouteProps {
  /** Si défini, seuls ces rôles (adhésion flotte active / `flotte_adhesions`) accèdent au sous-arbre ; sinon pas de filtre rôle à la racine. */
  allowedRoles?: readonly AppRole[];
  /** Cible si le rôle n’est pas autorisé (défaut : tableau de bord). */
  roleFallbackTo?: string;
}

/**
 * Garde principale dashboard (couche UX ; RLS Supabase reste la source serveur) :
 * - authentification
 * - adhésion flotte (`tenant_bootstrap` → `/start`, aligné avec `computeAuthFlowDecision`)
 * - premier login / wizard produit (`onboarding` → `/onboarding`)
 * - plan payant expiré (`abonnements` + RPC plan → `/upgrade`)
 * - optionnel : liste de rôles autorisés sur la flotte active
 */
export function ProtectedRoute({
  allowedRoles,
  roleFallbackTo = ROUTE_PATHS.dashboard,
}: ProtectedRouteProps) {
  const access = useRouteAccess();
  const { isAdmin } = useRoleAccess();
  const { activeTenantContext } = useAuth();
  const location = useLocation();
  const loginWithReturn = getLoginPathPreservingReturn(location);

  const roleAllowed =
    !allowedRoles?.length ||
    (Boolean(activeTenantContext?.role) &&
      allowedRoles.includes(activeTenantContext!.role));
  const adminPathAllowed =
    location.pathname === ROUTE_PATHS.dashboard ||
    location.pathname === ROUTE_PATHS.dashboardProfile ||
    location.pathname === ROUTE_PATHS.dashboardAdmin ||
    location.pathname.startsWith(`${ROUTE_PATHS.dashboardAdmin}/`);

  return (
    <RequireAuth>
      {access.state === "loading" && <PageLoader />}
      {access.state === "unauth" && <Navigate to={loginWithReturn} replace />}
      {access.state === "tenant_bootstrap" && (
        <Navigate to={ROUTE_PATHS.tenantBootstrap} replace />
      )}
      {access.state === "onboarding" && (
        <Navigate to={ROUTE_PATHS.onboarding} replace />
      )}
      {access.state === "upgrade" && (
        <Navigate to={ROUTE_PATHS.upgrade} replace />
      )}
      {access.state === "ready" && !isAdmin && !roleAllowed && (
        <Navigate to={roleFallbackTo} replace />
      )}
      {access.state === "ready" && isAdmin && !adminPathAllowed && (
        <Navigate to={ROUTE_PATHS.dashboardAdmin} replace />
      )}
      {access.state === "ready" && roleAllowed && (!isAdmin || adminPathAllowed) && <Outlet />}
    </RequireAuth>
  );
}
