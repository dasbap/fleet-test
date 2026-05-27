/**
 * Composant <PermissionRoute> — garde de route basé sur les permissions RBAC.
 *
 * À utiliser dans la définition des routes pour protéger des pages entières.
 * Pour les éléments UI inline, utiliser <Can> à la place.
 *
 * Usage dans les routes :
 *   <Route
 *     path="/billing"
 *     element={
 *       <PermissionRoute permission="billing.view">
 *         <BillingPage />
 *       </PermissionRoute>
 *     }
 *   />
 *
 *   // Redirect custom
 *   <PermissionRoute permission="admin.access" redirectTo="/dashboard">
 *     <AdminPage />
 *   </PermissionRoute>
 *
 *   // Avec fallback inline (au lieu d'une redirection)
 *   <PermissionRoute permission="report.export" inline>
 *     <ExportPage />
 *   </PermissionRoute>
 */

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import type { Permission } from "@/config/permissions";

interface PermissionRouteProps {
  /** Permission requise pour accéder à cette route. */
  permission: Permission;
  /** Contenu à afficher si autorisé. */
  children: ReactNode;
  /**
   * Route vers laquelle rediriger si non autorisé.
   * Par défaut : /dashboard (accueil après connexion).
   */
  redirectTo?: string;
  /**
   * Si true, affiche un message d'accès interdit inline au lieu de rediriger.
   * Utile pour les sous-sections d'une page principale.
   */
  inline?: boolean;
}

function PermissionDenied() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <span className="text-2xl" aria-hidden="true">🔒</span>
        </div>
        <h2 className="mb-1 text-lg font-semibold">Accès restreint</h2>
        <p className="text-sm text-muted-foreground">
          Vous n'avez pas les droits nécessaires pour accéder à cette section.
        </p>
      </div>
    </div>
  );
}

export function PermissionRoute({
  permission,
  children,
  redirectTo,
  inline = false,
}: PermissionRouteProps) {
  const { can, isLoading } = useRoleAccess();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!can(permission)) {
    if (inline) return <PermissionDenied />;
    return <Navigate to={redirectTo ?? ROUTE_PATHS.dashboard} replace />;
  }

  return <>{children}</>;
}
