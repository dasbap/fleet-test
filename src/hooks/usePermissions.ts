/**
 * Hook permissions E-Samba — wrapper métier au-dessus de useRoleAccess.
 *
 * Expose :
 *   - can() / canAny() / canAll()  → permissions granulaires (nouveau système)
 *   - isOwner / isAdmin / isManager / isMechanic / isDriver → booléens sémantiques
 *   - Les anciennes propriétés (canAccessFinances, etc.)     → compat ascendante
 *
 * Pas de requête réseau : useRoleAccess résout l'admin via admin_profiles au montage.
 */

import { useMemo } from "react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/hooks/useAuth";
import { hasModuleAccess } from "@/auth/permissions";
import type { Permission } from "@/config/permissions";

export interface UsePermissionsReturn {
  // ── Nouveau système RBAC ────────────────────────────────────────────────────
  /** Rôle plateforme effectif (null si non connecté ou pas de membership). */
  role: ReturnType<typeof useRoleAccess>["rbac"]["platformRole"];

  /** Vérifie une permission granulaire. */
  can: (permission: Permission) => boolean;

  /** Vérifie plusieurs permissions (OR logique). */
  canAny: (permissions: Permission[]) => boolean;

  /** Vérifie plusieurs permissions (AND logique). */
  canAll: (permissions: Permission[]) => boolean;

  // ── Booléens sémantiques ────────────────────────────────────────────────────
  /** Propriétaire / organisateur de flotte. */
  isOwner: boolean;
  /** Admin plateforme E-Samba. */
  isAdmin: boolean;
  /** Manager (gestionnaire) de flotte. */
  isManager: boolean;
  /** Mécanicien. */
  isMechanic: boolean;
  /** Conducteur. */
  isDriver: boolean;

  // ── Compatibilité ascendante (ancien système module-based) ─────────────────
  /** @deprecated Utiliser can("billing.view") */
  canAccessFinances: boolean;
  /** @deprecated Utiliser can("admin.access") */
  canAccessBackoffice: boolean;
  /** @deprecated Utiliser can("report.view") */
  canAccessCollections: boolean;
  /** @deprecated Utiliser can("maintenance.view") */
  canAccessHistoryWorkshop: boolean;
  /** @deprecated Utiliser isAdmin */
  canViewSystemHealth: boolean;
  /** @deprecated Utiliser can("vehicle.create") */
  canWriteFleet: boolean;
  /** @deprecated Utiliser can("dvir.submit") */
  canReportIncident: boolean;
  /** @deprecated Utiliser can("maintenance.create") */
  canCreateMaintenanceFromIncident: boolean;
  /** @deprecated Utiliser isAtLeast("manager") depuis useRoleAccess */
  canAccessRolesHub: boolean;
  /** @deprecated Utiliser isAtLeast("manager") depuis useRoleAccess */
  showRolesSidebarLink: boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { can, canAny, canAll, isAdmin, rbac } = useRoleAccess();
  const { role: legacyRole } = useAuth();

  const platformRole = rbac.platformRole;
  const fleetRole    = rbac.fleetRole;

  return useMemo(() => ({
    // Nouveau RBAC
    role: platformRole,
    can,
    canAny,
    canAll,

    // Sémantique
    isOwner:    platformRole === "organizer" || isAdmin,
    isAdmin,
    isManager:  platformRole === "manager",
    isMechanic: platformRole === "mechanic",
    isDriver:   platformRole === "driver",

    // Compat ascendante (garde les noms exacts pour éviter de casser DashboardSidebar etc.)
    canAccessFinances:                hasModuleAccess(legacyRole, "finances"),
    canAccessBackoffice:              hasModuleAccess(legacyRole, "backoffice"),
    canAccessCollections:             hasModuleAccess(legacyRole, "collections"),
    canAccessHistoryWorkshop:         hasModuleAccess(legacyRole, "history_workshop"),
    canViewSystemHealth:              hasModuleAccess(legacyRole, "system_health"),
    canWriteFleet:                    hasModuleAccess(legacyRole, "fleet_write"),
    canReportIncident:                hasModuleAccess(legacyRole, "incident_report"),
    canCreateMaintenanceFromIncident: hasModuleAccess(legacyRole, "incident_maintenance"),
    canAccessRolesHub:                hasModuleAccess(legacyRole, "roles_hub"),
    showRolesSidebarLink:             hasModuleAccess(legacyRole, "roles_sidebar_link"),
  }), [platformRole, fleetRole, isAdmin, legacyRole, can, canAny, canAll]);
}
