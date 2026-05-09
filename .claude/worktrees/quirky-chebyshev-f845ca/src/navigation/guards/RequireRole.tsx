import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import type { MobileAppRole } from "@/types/mobile-app-role";
import { toAppRole } from "@/lib/mobile/mobileRoleBridge";
import { getLoginPathPreservingReturn } from "@/navigation/loginRedirectPath";
import { ROUTE_PATHS } from "@/navigation/routePaths";

interface RequireRoleProps {
  children: ReactNode;
  /** Au moins un de ces rôles est requis (persistance et/ou nomenclature métier). */
  allow: readonly (AppRole | MobileAppRole)[];
  /** Redirection si le rôle ne convient pas (défaut : tableau de bord). */
  fallbackTo?: string;
  /** Si défini et rôle = conducteur hors liste, prioritaire sur `fallbackTo`. */
  fallbackWhenDriver?: string;
  /** Si défini et rôle = mécanicien hors liste, prioritaire sur `fallbackTo`. */
  fallbackWhenMechanic?: string;
}

function RoleGate({
  children,
  allow,
  fallbackTo = ROUTE_PATHS.dashboard,
  fallbackWhenDriver,
  fallbackWhenMechanic,
}: RequireRoleProps) {
  const { role, isLoading, user } = useAuth();
  const location = useLocation();
  const loginWithReturn = getLoginPathPreservingReturn(location);
  const allowedAppRoles = allow.map((r) => toAppRole(r));

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={loginWithReturn} replace />;
  }

  if (!role || !allowedAppRoles.includes(role)) {
    const target =
      role === "driver" && fallbackWhenDriver !== undefined
        ? fallbackWhenDriver
        : role === "mechanic" && fallbackWhenMechanic !== undefined
          ? fallbackWhenMechanic
          : fallbackTo;
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}

/**
 * Garde : rôle applicatif dans la liste autorisée (session + memberships déjà résolus par useAuth).
 */
export const RequireRole = RoleGate;

export const RoleGuard = RoleGate;
