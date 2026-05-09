import { hasModuleAccess } from "@/auth/permissions";
import type { AppRole, AuthFlowPermissions, PlanEnables, UserRole } from "@/types/auth";

function asAppRole(role: UserRole | null): AppRole | null {
  if (!role || role === "visitor") {
    return null;
  }
  return role;
}

/**
 * Permissions UI agrégées (rôle + capacités plan).
 * Les modules métier restent alignés sur `hasModuleAccess` quand c’est pertinent.
 */
export function computeAuthFlowPermissions(
  role: UserRole | null,
  enables: PlanEnables,
): AuthFlowPermissions {
  const ar = asAppRole(role);

  const manageAlerts =
    ar !== null &&
    (ar === "organizer" || ar === "manager" || ar === "mechanic");

  const openCreneaux =
    ar !== null &&
    (ar === "organizer" || ar === "manager" || ar === "driver");

  const manageMaintenance =
    ar !== null &&
    (ar === "organizer" || ar === "manager" || ar === "mechanic");

  const baseReports =
    enables.reports &&
    ar !== null &&
    (ar === "organizer" || ar === "manager");

  const inviteMembers =
    ar !== null && (ar === "organizer" || ar === "manager");

  const useAI =
    enables.ai &&
    ar !== null &&
    (ar === "organizer" || ar === "manager" || ar === "mechanic");

  return {
    viewDashboard: Boolean(role),
    manageVehicles: ar !== null && hasModuleAccess(ar, "fleet_write"),
    manageAlerts,
    openCreneaux,
    manageMaintenance,
    viewReports: baseReports,
    viewFinance:
      enables.finance && ar !== null && hasModuleAccess(ar, "finances"),
    manageOrg: ar === "organizer",
    inviteMembers,
    useAI,
  };
}
