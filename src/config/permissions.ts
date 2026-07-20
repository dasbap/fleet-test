/**
 * Façade publique RBAC — point d'entrée unique pour les permissions dans les composants.
 *
 * N'ajoute pas de logique : tout est délégué à src/lib/rbac/permissions.ts.
 * Les pages et composants importent depuis ICI, jamais directement depuis lib/rbac.
 *
 * Sécurité : ce module est 100 % côté client (UX aid).
 * La vérification serveur (RLS + rbac_check_permission) reste la frontière réelle.
 */

// ─── Ré-exports des types ─────────────────────────────────────────────────────

export type { Permission, PlatformRole, RbacCheckResult, RbacContext } from "@/types/rbac";
export type { AppRole } from "@/types/auth";

/**
 * Alias sémantique unique pour les composants : Role = PlatformRole.
 * Ne pas redéfinir `Role` ailleurs (types/role, mobile-app-role, barrel).
 */
export type { PlatformRole as Role } from "@/types/rbac";

export { ROLE_HIERARCHY } from "@/types/rbac";

// ─── Ré-exports de la matrice et des helpers ──────────────────────────────────

export {
  ROLE_PERMISSIONS,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  roleIsAtLeast,
  canManageRole,
  getPermissionsForRole,
  buildClientRbacResult,
  PROTECTED_ROUTES,
} from "@/lib/rbac/permissions";

// ─── Helper de haut niveau ────────────────────────────────────────────────────

import type { Permission, PlatformRole } from "@/types/rbac";
import { hasPermission } from "@/lib/rbac/permissions";

/**
 * Vérifie si un rôle peut accéder à une fonctionnalité.
 * Alias lisible de `hasPermission` pour les cas simples.
 *
 * @example
 * if (canAccessFeature(role, "billing.view")) showBillingTab();
 */
export function canAccessFeature(
  role: PlatformRole | null,
  permission: Permission,
): boolean {
  return hasPermission(role, permission);
}
