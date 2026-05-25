/**
 * Composant <Can> — affichage conditionnel basé sur les permissions RBAC.
 *
 * Usage :
 *   <Can permission="vehicle.create">
 *     <Button>Ajouter un véhicule</Button>
 *   </Can>
 *
 *   // Avec fallback
 *   <Can permission="billing.manage" fallback={<p>Accès réservé au propriétaire.</p>}>
 *     <BillingActions />
 *   </Can>
 *
 *   // Plusieurs permissions (OR)
 *   <Can anyOf={["vehicle.create", "vehicle.update"]}>
 *     <VehicleForm />
 *   </Can>
 *
 *   // Plusieurs permissions (AND)
 *   <Can allOf={["member.invite", "member.update_role"]}>
 *     <InviteManager />
 *   </Can>
 */

import type { ReactNode } from "react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import type { Permission } from "@/config/permissions";

interface CanProps {
  /** Permission unique requise. */
  permission?: Permission;
  /** Au moins une de ces permissions (OR). */
  anyOf?: Permission[];
  /** Toutes ces permissions (AND). */
  allOf?: Permission[];
  /** Contenu affiché si autorisé. */
  children: ReactNode;
  /** Contenu affiché si non autorisé (rien par défaut). */
  fallback?: ReactNode;
}

export function Can({ permission, anyOf, allOf, children, fallback = null }: CanProps) {
  const { can, canAny, canAll, isLoading } = useRoleAccess();

  // Pendant le chargement admin_profiles, on ne rend rien (évite un flash incorrect)
  if (isLoading) return null;

  let allowed = false;

  if (permission) {
    allowed = can(permission);
  } else if (anyOf && anyOf.length > 0) {
    allowed = canAny(anyOf);
  } else if (allOf && allOf.length > 0) {
    allowed = canAll(allOf);
  } else {
    // Aucune restriction spécifiée — afficher par défaut
    allowed = true;
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}
