/**
 * Chemins centralisés Flotte E-Samba (web + mobile WebView).
 * Préférer ces constantes aux chaînes en dur dans les composants.
 */

export const ROUTE_PATHS = {
  home: "/",
  auth: "/auth",
  /** Création de flotte / première adhésion. */
  tenantBootstrap: "/start",
  /** Wizard d’accueil produit. */
  onboarding: "/onboarding",
  /** Point d’entrée après Supabase signIn. */
  postLogin: "/post-login",
  /** Raccourci mobile / conducteur → hub opérations. */
  terrain: "/terrain",
  /** Scan QR sous le hub terrain (sans shell dashboard). */
  terrainScan: "/terrain/scan",
  /** Raccourci atelier → maintenance. */
  maintenanceRoot: "/maintenance",
  /** Renouvellement / passage à un plan payant. */
  upgrade: "/upgrade",
  /** Connexion mobile-first (session mockée si VITE_USE_MOCK_AUTH). */
  login: "/login",
  dashboard: "/dashboard",
  dashboardVehicles: "/dashboard/vehicles",
  dashboardVehicleDetail: (vehicleId: string) =>
    `/dashboard/vehicles/${vehicleId}` as const,
  dashboardMyVehicle: "/dashboard/my-vehicle",
  dashboardAlerts: "/dashboard/alerts",
  dashboardTutorials: "/dashboard/tutorials",
  dashboardTutorialDetail: (tutorialId: string) =>
    `/dashboard/tutorials/${tutorialId}` as const,
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
