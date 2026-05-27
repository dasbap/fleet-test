/**
 * Rôle effectif de l'utilisateur sur la flotte active.
 */

import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/types/auth";

export interface UseCurrentRoleReturn {
  role: AppRole | null;
  fleetId: string | null;
  isOrganizer: boolean;
  isManager: boolean;
  isDriver: boolean;
  isMechanic: boolean;
}

export function useCurrentRole(): UseCurrentRoleReturn {
  const { role, userFleetId } = useAuth();

  return {
    role,
    fleetId: userFleetId ?? null,
    isOrganizer: role === "organizer",
    isManager: role === "manager",
    isDriver: role === "driver",
    isMechanic: role === "mechanic",
  };
}
