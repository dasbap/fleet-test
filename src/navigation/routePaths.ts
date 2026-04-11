/**
 * Chemins centralisés Flotte E-Samba (web + mobile WebView).
 * Préférer ces constantes aux chaînes en dur dans les composants.
 */

export const ROUTE_PATHS = {
  home: "/",
  auth: "/auth",
  /** Connexion mobile-first (session mockée si VITE_USE_MOCK_AUTH). */
  login: "/login",
  dashboard: "/dashboard",
  dashboardVehicles: "/dashboard/vehicles",
  dashboardVehicleDetail: (vehicleId: string) =>
    `/dashboard/vehicles/${vehicleId}` as const,
  dashboardMyVehicle: "/dashboard/my-vehicle",
  dashboardAlerts: "/dashboard/alerts",
  dashboardAlertDetail: (alertId: string) =>
    `/dashboard/alerts/${alertId}` as const,
  dashboardOperations: "/dashboard/operations",
  dashboardScan: "/dashboard/scan",
  dashboardMissionDetail: (missionId: string) =>
    `/dashboard/operations/mission/${missionId}` as const,
  dashboardInterventionDetail: (ticketId: string) =>
    `/dashboard/operations/intervention/${ticketId}` as const,
  dashboardShiftClosure: "/dashboard/closure",
  dashboardReports: "/dashboard/reports",
  /** Analytics rétention (organisateur). */
  dashboardRetentionAnalytics: "/dashboard/analytics/retention",
  dashboardInvitations: "/dashboard/invitations",
  dashboardTeams: "/dashboard/teams",
  dashboardProfile: "/dashboard/profile",
  /** Entretien (liste / rappels). */
  dashboardMaintenance: "/dashboard/maintenance",
  /** Incidents déclarés (liste). */
  dashboardIncidents: "/dashboard/incidents",
  dashboardSettings: "/dashboard/settings",
  dashboardRoles: "/dashboard/roles",
  dashboardDrivers: "/dashboard/drivers",
  dashboardFinances: "/dashboard/finances",
  dashboardCollections: "/dashboard/collections",
  dashboardHistory: "/dashboard/history",
  dashboardCreateFleet: "/dashboard/create-fleet",
  dashboardIncidentDeclare: "/dashboard/incidents/declare",
} as const;
