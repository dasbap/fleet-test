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
    return (
      pathname.startsWith("/dashboard/vehicles") ||
      pathname.startsWith("/dashboard/my-vehicle") ||
      pathname.startsWith("/dashboard/tutorials") ||
      pathname.startsWith("/dashboard/reports") ||
      pathname.startsWith("/dashboard/maintenance") ||
      pathname.startsWith("/dashboard/operations") ||
      pathname.startsWith("/dashboard/teams") ||
      pathname.startsWith("/dashboard/drivers") ||
      pathname.startsWith("/dashboard/invitations") ||
      pathname.startsWith("/dashboard/tracking") ||
      pathname.startsWith("/dashboard/geofencing") ||
      pathname.startsWith("/dashboard/finances") ||
      pathname.startsWith("/dashboard/collections") ||
      pathname.startsWith("/dashboard/billing") ||
      pathname.startsWith("/dashboard/coaching") ||
      pathname.startsWith("/dashboard/dashcam") ||
      pathname.startsWith("/dashboard/history") ||
      pathname.startsWith("/dashboard/admin/users") ||
      pathname.startsWith("/dashboard/roles") ||
      pathname.startsWith("/dashboard/analytics/retention")
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
