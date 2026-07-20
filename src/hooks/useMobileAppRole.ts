import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { MobileAppRole } from "@/types/mobile-app-role";
import { appRoleToMobileRole } from "@/lib/mobile/mobileRoleBridge";

/**
 * Rôle affiché dans l’UI mobile V1 (SUPERVISOR, FLEET_MANAGER, …).
 */
export function useMobileAppRole(): MobileAppRole | null {
  const { role } = useAuth();
  return useMemo(() => appRoleToMobileRole(role), [role]);
}
