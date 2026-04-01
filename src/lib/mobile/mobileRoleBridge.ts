import type { AppRole } from "@/types/auth";
import type { MobileAppRole } from "@/types/mobile-app-role";

/** Correspondance rôle mobile V1 → rôle persistance / API (inchangé côté backend). */
export const MOBILE_ROLE_TO_APP_ROLE: Record<MobileAppRole, AppRole> = {
  SUPERVISOR: "organizer",
  FLEET_MANAGER: "manager",
  MECHANIC: "mechanic",
  DRIVER: "driver",
};

/** Hiérarchie inverse pour dériver le rôle mobile affiché depuis AppRole. */
export const APP_ROLE_TO_MOBILE_ROLE: Record<AppRole, MobileAppRole> = {
  organizer: "SUPERVISOR",
  manager: "FLEET_MANAGER",
  mechanic: "MECHANIC",
  driver: "DRIVER",
};

export function mobileRoleToAppRole(role: MobileAppRole): AppRole {
  return MOBILE_ROLE_TO_APP_ROLE[role];
}

export function appRoleToMobileRole(role: AppRole | null): MobileAppRole | null {
  if (!role) return null;
  return APP_ROLE_TO_MOBILE_ROLE[role];
}

/** Normalise une entrée AppRole ou MobileAppRole vers AppRole (persistance). */
export function toAppRole(role: AppRole | MobileAppRole): AppRole {
  if (
    role === "SUPERVISOR" ||
    role === "FLEET_MANAGER" ||
    role === "MECHANIC" ||
    role === "DRIVER"
  ) {
    return mobileRoleToAppRole(role);
  }
  return role;
}

/** Normalise une entrée connexion (mock) : accepte AppRole ou MobileAppRole. */
export function normalizeLoginRole(
  role: AppRole | MobileAppRole | string | undefined
): AppRole {
  if (!role) return "manager";
  const r = role as string;
  if (r === "SUPERVISOR" || r === "FLEET_MANAGER" || r === "MECHANIC" || r === "DRIVER") {
    return MOBILE_ROLE_TO_APP_ROLE[r as MobileAppRole];
  }
  if (r === "organizer" || r === "manager" || r === "mechanic" || r === "driver") {
    return r as AppRole;
  }
  return "manager";
}
