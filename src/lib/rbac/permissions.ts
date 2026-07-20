/**
 * Matrice de permissions RBAC E-Samba — couche cliente (sans réseau).
 *
 * Source de vérité côté serveur : fonction SQL `rbac_check_permission`.
 * Ce module est la projection TypeScript de cette matrice pour les guards UI.
 *
 * Règle : toujours valider côté serveur pour les opérations sensibles.
 * Le frontend est une UX aid, pas une frontière de sécurité.
 */

import type { AppRole } from "@/types/auth";
import type { Permission, PlatformRole, RbacCheckResult } from "@/types/rbac";

// ═══════════════════════════════════════════════════════════════════════════════
// Matrice de permissions par rôle
// ═══════════════════════════════════════════════════════════════════════════════

type PermissionMatrix = Record<PlatformRole, ReadonlySet<Permission>>;

const ALL_PERMISSIONS = new Set<Permission>([
  "fleet.view", "fleet.create", "fleet.update", "fleet.delete",
  "vehicle.view", "vehicle.create", "vehicle.update", "vehicle.delete", "vehicle.assign_driver",
  "member.view", "member.invite", "member.remove", "member.update_role",
  "maintenance.view", "maintenance.create", "maintenance.update", "maintenance.delete",
  "assignment.view_own", "assignment.view_all", "assignment.manage",
  "report.view", "report.export",
  "billing.view", "billing.manage",
  "dvir.submit", "dvir.view_all",
  "org.settings", "org.manage",
  "admin.access", "admin.manage_users", "admin.manage_all_fleets",
]);

export const ROLE_PERMISSIONS: PermissionMatrix = {

  admin: ALL_PERMISSIONS,

  organizer: new Set<Permission>([
    "fleet.view", "fleet.create", "fleet.update", "fleet.delete",
    "vehicle.view", "vehicle.create", "vehicle.update", "vehicle.delete", "vehicle.assign_driver",
    "member.view", "member.invite", "member.remove", "member.update_role",
    "maintenance.view", "maintenance.create", "maintenance.update", "maintenance.delete",
    "assignment.view_own", "assignment.view_all", "assignment.manage",
    "report.view", "report.export",
    "billing.view", "billing.manage",
    "dvir.submit", "dvir.view_all",
    "org.settings", "org.manage",
  ]),

  manager: new Set<Permission>([
    "fleet.view", "fleet.update",
    "vehicle.view", "vehicle.create", "vehicle.update", "vehicle.assign_driver",
    "member.view", "member.invite",
    "maintenance.view", "maintenance.create", "maintenance.update",
    "assignment.view_own", "assignment.view_all", "assignment.manage",
    "report.view",
    "dvir.submit", "dvir.view_all",
    "org.settings",
  ]),

  mechanic: new Set<Permission>([
    "fleet.view",
    "vehicle.view", "vehicle.update",
    "member.view",
    "maintenance.view", "maintenance.create", "maintenance.update",
    "assignment.view_own",
    "report.view",
    "dvir.submit", "dvir.view_all",
  ]),

  driver: new Set<Permission>([
    "fleet.view",
    "vehicle.view",
    "member.view",
    "assignment.view_own",
    "report.view",     // rapports propres seulement
    "dvir.submit",
  ]),

} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers purs (sans dépendance React ni réseau)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie si un rôle a une permission donnée.
 * Pour `isAdmin`, utiliser `hasPermission("admin", permission)`.
 */
export function hasPermission(
  role: PlatformRole | null,
  permission: Permission,
): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] as Set<Permission>).has(permission);
}

/**
 * Vérifie si un rôle est au moins aussi élevé que le rôle cible.
 * Hiérarchie : admin > organizer > manager > mechanic > driver
 */
export function roleIsAtLeast(
  userRole: PlatformRole | null,
  minRole: PlatformRole,
): boolean {
  if (!userRole) return false;
  const HIERARCHY: PlatformRole[] = ["admin", "organizer", "manager", "mechanic", "driver"];
  const userIndex = HIERARCHY.indexOf(userRole);
  const minIndex  = HIERARCHY.indexOf(minRole);
  if (userIndex === -1 || minIndex === -1) return false;
  return userIndex <= minIndex; // index plus bas = rôle plus élevé
}

/**
 * Vérifie si un rôle peut en gérer un autre (pour les invitations, changements de rôle).
 * Un rôle ne peut inviter que des rôles inférieurs ou égaux.
 */
export function canManageRole(
  managerRole: PlatformRole | null,
  targetRole: AppRole,
): boolean {
  if (!managerRole) return false;
  if (managerRole === "admin") return true;
  if (managerRole === "organizer") return true; // peut gérer tous les rôles flotte
  if (managerRole === "manager") {
    return targetRole !== "organizer"; // manager ne peut pas inviter un organizer
  }
  return false; // mechanic et driver ne peuvent pas gérer des rôles
}

/**
 * Retourne toutes les permissions d'un rôle sous forme d'array.
 */
export function getPermissionsForRole(role: PlatformRole | null): Permission[] {
  if (!role) return [];
  return Array.from(ROLE_PERMISSIONS[role] as Set<Permission>);
}

/**
 * Vérifie une liste de permissions en une seule passe (AND logique).
 */
export function hasAllPermissions(
  role: PlatformRole | null,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Vérifie une liste de permissions (OR logique).
 */
export function hasAnyPermission(
  role: PlatformRole | null,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Construit un résultat RBAC normalisé côté client (sans vérification réseau).
 * À n'utiliser que pour l'UX — la vérification serveur reste la source de vérité.
 */
export function buildClientRbacResult(
  role: PlatformRole | null,
  permission: Permission,
  isDemo = false,
): RbacCheckResult {
  if (isDemo && permission.startsWith("admin.")) {
    return { allowed: false, role, reason: "demo_blocked" };
  }
  const allowed = hasPermission(role, permission);
  return {
    allowed,
    role,
    reason: !role
      ? "no_fleet_access"
      : allowed
        ? role === "admin" ? "platform_admin" : "role_allowed"
        : "role_denied",
  };
}

// ─── Routes frontend protégées par rôle ──────────────────────────────────────

/** Routes nécessitant au moins un membership actif (exclut les visiteurs). */
export const PROTECTED_ROUTES: ReadonlyMap<string, Permission> = new Map([
  ["/dashboard",   "fleet.view"],
  ["/vehicles",    "vehicle.view"],
  ["/maintenance", "maintenance.view"],
  ["/reports",     "report.view"],
  ["/billing",     "billing.view"],
  ["/members",     "member.view"],
  ["/admin",       "admin.access"],
  ["/settings/org","org.settings"],
  ["/exports",     "report.export"],
]);
