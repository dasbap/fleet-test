import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Car,
  Home,
  LayoutGrid,
  User,
} from "lucide-react";
import type { AppRole } from "@/hooks/useAuth";
import { ROUTE_PATHS } from "@/navigation/routePaths";

export type MobileTabId =
  | "home"
  | "fleet"
  | "alerts"
  | "operations"
  | "account";

export interface MobileTabDefinition {
  id: MobileTabId;
  label: string;
  to: string;
  icon: LucideIcon;
}

/** Chemin de l’onglet Flotte selon le rôle (conducteur → mon véhicule). */
export function getFleetPathForRole(role: AppRole | null): string {
  return role === "driver"
    ? ROUTE_PATHS.dashboardMyVehicle
    : ROUTE_PATHS.dashboardVehicles;
}

/** Onglets principaux Flotte E-Samba (ordre fixe). */
export function getMobileTabsForRole(
  role: AppRole | null
): MobileTabDefinition[] {
  const fleetPath = getFleetPathForRole(role);
  const operationsTab =
    role === "driver"
      ? { id: "operations" as const, label: "Scan", to: ROUTE_PATHS.dashboardScan, icon: LayoutGrid }
      : { id: "operations" as const, label: "Opérations", to: ROUTE_PATHS.dashboardOperations, icon: LayoutGrid };
  return [
    {
      id: "home",
      label: "Accueil",
      to: ROUTE_PATHS.dashboard,
      icon: Home,
    },
    { id: "fleet", label: "Flotte", to: fleetPath, icon: Car },
    {
      id: "alerts",
      label: "Alertes",
      to: ROUTE_PATHS.dashboardAlerts,
      icon: Bell,
    },
    operationsTab,
    {
      id: "account",
      label: "Compte",
      to: ROUTE_PATHS.dashboardProfile,
      icon: User,
    },
  ];
}

/**
 * Indique si la route courante correspond à un onglet (y compris sous-routes).
 */
export function isTabActive(
  tab: MobileTabDefinition,
  pathname: string
): boolean {
  const dash = ROUTE_PATHS.dashboard;
  if (tab.id === "home") {
    return pathname === dash || pathname === `${dash}/`;
  }
  if (tab.id === "fleet") {
    return (
      pathname.startsWith("/dashboard/vehicles") ||
      pathname.startsWith("/dashboard/my-vehicle")
    );
  }
  if (tab.id === "alerts") {
    return pathname.startsWith("/dashboard/alerts");
  }
  if (tab.id === "operations") {
    return pathname.startsWith("/dashboard/operations") || pathname.startsWith("/dashboard/scan");
  }
  if (tab.id === "account") {
    return (
      pathname.startsWith("/dashboard/profile") ||
      pathname.startsWith("/dashboard/settings")
    );
  }
  return false;
}
