import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { hasModuleAccess } from "@/auth/permissions";

/**
 * Droits dérivés du rôle courant pour l’UI (pas de requête réseau).
 */
export function usePermissions() {
  const { role } = useAuth();

  return useMemo(
    () => ({
      role,
      canAccessFinances: hasModuleAccess(role, "finances"),
      canAccessBackoffice: hasModuleAccess(role, "backoffice"),
      canAccessCollections: hasModuleAccess(role, "collections"),
      canAccessHistoryWorkshop: hasModuleAccess(role, "history_workshop"),
      canViewSystemHealth: hasModuleAccess(role, "system_health"),
      canWriteFleet: hasModuleAccess(role, "fleet_write"),
      canReportIncident: hasModuleAccess(role, "incident_report"),
      canCreateMaintenanceFromIncident: hasModuleAccess(role, "incident_maintenance"),
      canAccessRolesHub: hasModuleAccess(role, "roles_hub"),
      showRolesSidebarLink: hasModuleAccess(role, "roles_sidebar_link"),
    }),
    [role]
  );
}
