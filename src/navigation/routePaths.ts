/**
 * Chemins centralisés Flotte E-Samba (web + mobile WebView).
 * Préférer ces constantes aux chaînes en dur dans les composants.
 */

export const ROUTE_PATHS = {
  home: "/",
  auth: "/auth",
  dashboard: "/dashboard",
  dashboardVehicles: "/dashboard/vehicles",
  dashboardVehicleDetail: (vehicleId: string) =>
    `/dashboard/vehicles/${vehicleId}` as const,
  dashboardMyVehicle: "/dashboard/my-vehicle",
  dashboardAlerts: "/dashboard/alerts",
  dashboardAlertDetail: (alertId: string) =>
    `/dashboard/alerts/${alertId}` as const,
  dashboardOperations: "/dashboard/operations",
  dashboardMissionDetail: (missionId: string) =>
    `/dashboard/operations/mission/${missionId}` as const,
  dashboardInterventionDetail: (ticketId: string) =>
    `/dashboard/operations/intervention/${ticketId}` as const,
  dashboardProfile: "/dashboard/profile",
  /** Entretien (liste / rappels). */
  dashboardMaintenance: "/dashboard/maintenance",
  /** Incidents déclarés (liste). */
  dashboardIncidents: "/dashboard/incidents",
  dashboardSettings: "/dashboard/settings",
  dashboardRoles: "/dashboard/roles",
  dashboardDrivers: "/dashboard/drivers",
  dashboardCreateFleet: "/dashboard/create-fleet",
} as const;
