import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Home,
  Menu,
  User,
} from "lucide-react";
import type { AppRole } from "@/hooks/useAuth";
import { ROUTE_PATHS } from "@/navigation/routePaths";

export type MobileTabId =
  | "home"
  | "alerts"
  | "menu"
  | "account";

export interface MobileTabDefinition {
  id: MobileTabId;
  label: string;
  to: string;
  icon: LucideIcon;
}

/** Chemin de l’onglet Flotte selon le rôle (conducteur → mon véhicule). */
/** Onglets principaux Flotte E-Samba (ordre fixe). */
export function getMobileTabsForRole(
  _role: AppRole | null
): MobileTabDefinition[] {
  return [
    {
      id: "home",
      label: "Accueil",
      to: ROUTE_PATHS.dashboard,
      icon: Home,
    },
    {
      id: "menu",
      label: "Menu",
      to: "#mobile-menu",
      icon: Menu,
    },
    {
      id: "alerts",
      label: "Alertes",
      to: ROUTE_PATHS.dashboardAlerts,
      icon: Bell,
    },
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
  if (tab.id === "alerts") {
    return pathname.startsWith("/dashboard/alerts");
  }
  if (tab.id === "menu") {
    const prefixes = [
      ROUTE_PATHS.dashboardVehicles,
      ROUTE_PATHS.dashboardMyVehicle,
      ROUTE_PATHS.dashboardTutorials,
      ROUTE_PATHS.dashboardReports,
      ROUTE_PATHS.dashboardMaintenance,
      ROUTE_PATHS.dashboardOperations,
      ROUTE_PATHS.dashboardTeams,
      ROUTE_PATHS.dashboardDrivers,
      ROUTE_PATHS.dashboardInvitations,
      ROUTE_PATHS.dashboardTracking,
      ROUTE_PATHS.dashboardGeofencing,
      ROUTE_PATHS.dashboardFinances,
      ROUTE_PATHS.dashboardCollections,
      ROUTE_PATHS.dashboardBilling,
      ROUTE_PATHS.dashboardCoaching,
      ROUTE_PATHS.dashboardDashcam,
      ROUTE_PATHS.dashboardHistory,
      ROUTE_PATHS.dashboardIncidents,
      ROUTE_PATHS.dashboardShiftClosure,
      "/dashboard/admin/users",
      ROUTE_PATHS.dashboardRoles,
      ROUTE_PATHS.dashboardRetentionAnalytics,
    ];

    return prefixes.some((prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }
  if (tab.id === "account") {
    return (
      pathname.startsWith("/dashboard/profile") ||
      pathname.startsWith("/dashboard/settings")
    );
  }
  return false;
}
