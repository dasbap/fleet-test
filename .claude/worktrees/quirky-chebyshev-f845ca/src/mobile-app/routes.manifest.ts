import { ROUTE_PATHS } from "@/navigation/routePaths";

/** Identifiants des 5 onglets bas — alignés sur `mobileTabs.ts`. */
export type MobileTabRouteId =
  | "home"
  | "fleet"
  | "alerts"
  | "tutorials"
  | "account";

export const MOBILE_TAB_ROUTES: Record<
  MobileTabRouteId,
  { path: string; labelFr: string }
> = {
  home: { path: ROUTE_PATHS.dashboard, labelFr: "Accueil" },
  fleet: { path: ROUTE_PATHS.dashboardVehicles, labelFr: "Flotte" },
  alerts: { path: ROUTE_PATHS.dashboardAlerts, labelFr: "Alertes" },
  tutorials: { path: ROUTE_PATHS.dashboardTutorials, labelFr: "Guides" },
  account: { path: ROUTE_PATHS.dashboardProfile, labelFr: "Compte" },
};
