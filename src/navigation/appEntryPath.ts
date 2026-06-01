import type { AppRole } from "@/types/auth";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/** Point d'entrée applicatif selon le rôle actif (navbar connectée). */
export function getAppEntryPath(role: AppRole | null | undefined): string {
  if (role === "driver") return ROUTE_PATHS.terrain;
  if (role === "mechanic") return ROUTE_PATHS.dashboardMaintenance;
  return ROUTE_PATHS.dashboard;
}
