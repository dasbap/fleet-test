/**
 * Guards RBAC frontend E-Samba.
 *
 * Ces composants sont des UX aids — la sécurité réelle est assurée par RLS
 * et les middlewares BFF. Ne jamais utiliser ces guards comme unique barrière.
 *
 * Composants disponibles :
 *   - <RoleGuard>       : accès par rôle minimum
 *   - <PermissionGuard> : accès par permission granulaire
 *   - <AdminGuard>      : accès admin plateforme uniquement
 *   - <FleetGuard>      : accès à une flotte spécifique
 *   - withRoleAccess()  : HOC pour wrapper un composant avec un guard
 */

import type { ReactNode, ComponentType } from "react";
import { Navigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import type { Permission, PlatformRole } from "@/types/rbac";

// ─── Composant de fallback par défaut ─────────────────────────────────────────

function DefaultForbidden(): ReactNode {
  return (
    <div className="min-h-[40vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Accès restreint</h2>
        <p className="text-sm text-muted-foreground">
          Vous n'avez pas les droits nécessaires pour accéder à cette section.
        </p>
      </div>
    </div>
  );
}

// ─── Props communes ────────────────────────────────────────────────────────────

interface BaseGuardProps {
  children: ReactNode;
  /**
   * Contenu affiché si le guard bloque l'accès.
   * Par défaut : `<DefaultForbidden />`.
   * Passer `null` pour ne rien rendre.
   * Passer une chaîne de route pour rediriger (ex: "/dashboard").
   */
  fallback?: ReactNode | string | null;
  /** Si true, affiche un spinner pendant le chargement plutôt que de bloquer. */
  showLoadingState?: boolean;
}

function resolveFallback(
  fallback: BaseGuardProps["fallback"],
): ReactNode {
  if (fallback === null) return null;
  if (typeof fallback === "string") return <Navigate to={fallback} replace />;
  return fallback ?? <DefaultForbidden />;
}

// ─── RoleGuard ─────────────────────────────────────────────────────────────────

interface RoleGuardProps extends BaseGuardProps {
  /** Rôle minimum requis (hiérarchie : admin > organizer > manager > mechanic > driver). */
  minRole: PlatformRole;
}

/**
 * N'affiche les enfants que si l'utilisateur a au moins `minRole`.
 *
 * @example
 * <RoleGuard minRole="manager">
 *   <CreateVehicleButton />
 * </RoleGuard>
 */
export function RoleGuard({
  children,
  minRole,
  fallback,
  showLoadingState = false,
}: RoleGuardProps): ReactNode {
  const { isAtLeast, isLoading } = useRoleAccess();

  if (isLoading) {
    return showLoadingState
      ? <div className="animate-pulse h-8 w-full bg-muted rounded" />
      : null;
  }

  if (!isAtLeast(minRole)) return resolveFallback(fallback);

  return <>{children}</>;
}

// ─── PermissionGuard ──────────────────────────────────────────────────────────

interface PermissionGuardProps extends BaseGuardProps {
  /** Permission requise (ou liste de permissions : mode `any` ou `all`). */
  permission: Permission | Permission[];
  /** Si plusieurs permissions : "any" (OR) ou "all" (AND). Défaut : "all". */
  mode?: "any" | "all";
}

/**
 * N'affiche les enfants que si l'utilisateur a la permission requise.
 *
 * @example
 * <PermissionGuard permission="vehicle.create">
 *   <AddVehicleForm />
 * </PermissionGuard>
 *
 * <PermissionGuard permission={["report.view", "report.export"]} mode="any">
 *   <ReportsLink />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  permission,
  mode = "all",
  fallback,
  showLoadingState = false,
}: PermissionGuardProps): ReactNode {
  const { can, canAll, canAny, isLoading } = useRoleAccess();

  if (isLoading) {
    return showLoadingState
      ? <div className="animate-pulse h-8 w-full bg-muted rounded" />
      : null;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  const allowed = permissions.length === 1
    ? can(permissions[0])
    : mode === "any"
      ? canAny(permissions)
      : canAll(permissions);

  if (!allowed) return resolveFallback(fallback);

  return <>{children}</>;
}

// ─── AdminGuard ───────────────────────────────────────────────────────────────

interface AdminGuardProps extends BaseGuardProps {
  /** Si true, redirige vers /dashboard au lieu d'afficher le fallback. */
  redirectIfDenied?: boolean;
}

/**
 * Réservé aux admins plateforme. Les comptes démo ne peuvent jamais passer.
 *
 * @example
 * <AdminGuard redirectIfDenied>
 *   <AdminPanel />
 * </AdminGuard>
 */
export function AdminGuard({
  children,
  fallback,
  redirectIfDenied = false,
  showLoadingState = false,
}: AdminGuardProps): ReactNode {
  const { isAdmin, isLoading } = useRoleAccess();

  if (isLoading) {
    return showLoadingState
      ? <div className="animate-pulse h-8 w-full bg-muted rounded" />
      : null;
  }

  if (!isAdmin) {
    if (redirectIfDenied) return <Navigate to="/dashboard" replace />;
    return resolveFallback(fallback);
  }

  return <>{children}</>;
}

// ─── FleetGuard ───────────────────────────────────────────────────────────────

interface FleetGuardProps extends BaseGuardProps {
  /** ID de la flotte à laquelle l'accès est requis. */
  fleetId: string;
}

/**
 * N'affiche les enfants que si l'utilisateur a accès à la flotte `fleetId`.
 * L'admin plateforme passe toujours.
 *
 * @example
 * <FleetGuard fleetId={vehicle.fleet_id}>
 *   <VehicleDetails vehicle={vehicle} />
 * </FleetGuard>
 */
export function FleetGuard({
  children,
  fleetId,
  fallback,
  showLoadingState = false,
}: FleetGuardProps): ReactNode {
  const { hasFleetAccess, isLoading } = useRoleAccess();

  if (isLoading) {
    return showLoadingState
      ? <div className="animate-pulse h-8 w-full bg-muted rounded" />
      : null;
  }

  if (!hasFleetAccess(fleetId)) return resolveFallback(fallback);

  return <>{children}</>;
}

// ─── HOC withRoleAccess ───────────────────────────────────────────────────────

interface WithRoleAccessOptions {
  /** Permission requise (ou liste, voir `mode`). */
  permission?: Permission | Permission[];
  /** Rôle minimum requis. */
  minRole?: PlatformRole;
  /** Réservé admin seulement. */
  adminOnly?: boolean;
  /** Mode multi-permission. Défaut : "all". */
  mode?: "any" | "all";
  /** Route de redirection si accès refusé. Défaut : affiche DefaultForbidden. */
  redirectTo?: string;
}

/**
 * HOC pour protéger un composant entier par RBAC.
 *
 * @example
 * export default withRoleAccess(BillingPage, {
 *   permission: "billing.manage",
 *   redirectTo: "/dashboard",
 * });
 */
export function withRoleAccess<P extends object>(
  Component: ComponentType<P>,
  options: WithRoleAccessOptions,
): ComponentType<P> {
  const { permission, minRole, adminOnly, mode, redirectTo } = options;
  const fallback = redirectTo ? redirectTo : undefined;

  function GuardedComponent(props: P): ReactNode {
    if (adminOnly) {
      return (
        <AdminGuard fallback={fallback} redirectIfDenied={!!redirectTo}>
          <Component {...props} />
        </AdminGuard>
      );
    }

    if (minRole) {
      return (
        <RoleGuard minRole={minRole} fallback={fallback}>
          <Component {...props} />
        </RoleGuard>
      );
    }

    if (permission) {
      return (
        <PermissionGuard permission={permission} mode={mode} fallback={fallback}>
          <Component {...props} />
        </PermissionGuard>
      );
    }

    return <Component {...props} />;
  }

  GuardedComponent.displayName = `withRoleAccess(${Component.displayName ?? Component.name})`;

  return GuardedComponent;
}
