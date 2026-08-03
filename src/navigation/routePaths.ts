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
  /** Monitoring carburant. */
  fuel: "/fuel",
  /** Liste des inspections DVIR. */
  inspections: "/inspections",
  /** Nouveau rapport DVIR (checklist complète). */
  inspectionsNew: "/inspections/nouveau",
  /** Modification d'un rapport DVIR (édition 24h / auteur). */
  inspectionsEdit: (dvirId: string) => `/inspections/${dvirId}/modifier` as const,
  /** Détail inspection DVIR via splat route. */
  inspectionsDetail: (path: string) => `/inspections/${path}` as const,
  /** Hub transit CEMAC. */
  transit: "/transit",
  /** Détail transit via splat route. */
  transitDetail: (path: string) => `/transit/${path}` as const,
  /** Maintenance prédictive. */
  maintenancePredictive: "/maintenance/predictive",
  /** Renouvellement / passage à un plan payant. */
  upgrade: "/upgrade",
  /** Connexion mobile-first (session mockée si VITE_USE_MOCK_AUTH). */
  login: "/login",
  dashboard: "/dashboard",
  dashboardVehicles: "/dashboard/vehicles",
  dashboardVehicleDetail: (vehicleId: string) =>
    `/dashboard/vehicles/${vehicleId}` as const,
  /** Alias création véhicule (redirige vers la liste flotte). */
  dashboardVehiclesNew: "/dashboard/vehicles/new",
  dashboardMyVehicle: "/dashboard/my-vehicle",
  dashboardAlerts: "/dashboard/alerts",
  dashboardTutorials: "/dashboard/tutorials",
  dashboardTutorialDetail: (tutorialId: string) =>
    `/dashboard/tutorials/${tutorialId}` as const,
  dashboardAlertDetail: (alertId: string) =>
    `/dashboard/alerts/${alertId}` as const,
  dashboardOperations: "/dashboard/operations",
  /** Ancre vers la section validation des clôtures (manager / organisateur). */
  dashboardOperationsPendingClosures: "/dashboard/operations#clotures-en-attente",
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
  /** Classement et scores de performance des conducteurs. */
  dashboardDriverScores: "/dashboard/drivers/scores",
  dashboardFinances: "/dashboard/finances",
  dashboardCollections: "/dashboard/collections",
  dashboardHistory: "/dashboard/history",
  dashboardCreateFleet: "/dashboard/create-fleet",
  dashboardIncidentDeclare: "/dashboard/incidents/declare",
  /** Journal carburant (saisies + monitoring). */
  dashboardFuel: "/dashboard/fuel",
  /** DVIR — contrôles journaliers des véhicules. */
  dashboardInspections: "/dashboard/inspections",
  /** Maintenance prédictive IA — scores de risque de pannes. */
  dashboardPredictiveMaintenance: "/dashboard/maintenance/predictive",
  /** Transits CEMAC — passages frontières Zone CEMAC. */
  dashboardTransitCemac: "/dashboard/transit",
  /** Suivi GPS temps réel. */
  dashboardTracking: "/dashboard/tracking",
  /** Géofencing — zones géographiques + alertes entrée/sortie. */
  dashboardGeofencing: "/dashboard/geofencing",
  /** Rapports programmés — envoi automatique PDF/Excel. */
  dashboardScheduledReports: "/dashboard/reports/scheduled",
  dashboardBilling: "/dashboard/billing",
  /** Coaching vocal post-trajet — retours audio conducteur. */
  dashboardCoaching: "/dashboard/coaching",
  /** Dashcam AI — surveillance vidéo intelligente. */
  dashboardDashcam: "/dashboard/dashcam",
  /** Page publique sécurité. */
  securite: "/securite",
  /** Politique de cookies. */
  cookies: "/cookies",
  /** Page tarifs publique avec calculateur et checkout Notch Pay. */
  pricing: "/pricing",
  /** Alias français → redirect vers pricing. */
  tarifs: "/tarifs",
  /** Hub conversion fonctionnalités (contenu profond sur marketing). */
  fonctionnalites: "/fonctionnalites",
  fonctionnalitesPiloterFlotte: "/fonctionnalites/piloter-flotte",
  /** Hub modules par rôle métier. */
  modules: "/modules",
  /** FAQ marketing publique. */
  faq: "/faq",
  /** Contact et demande de démo. */
  contact: "/contact",
  /** Hub des cas d’usage marketing (SEO programmatique). */
  useCaseHub: "/use-case",
  /** Chemin détail cas d'usage (évite le préfixe `use` pour les règles React hooks). */
  caseDetailPath: (slug: string) => `/use-case/${slug}` as const,
  /** Formulaire de définition du nouveau mot de passe (flux PASSWORD_RECOVERY Supabase). */
  updatePassword: "/auth/update-password",
  /** Page standalone mot de passe oublié (envoi du lien). */
  forgotPassword: "/auth/forgot-password",
  /** Connexion sans mot de passe via lien magique. */
  magicLink: "/auth/magic-link",
  /** Callback Supabase — échange code PKCE (magic link, confirmation email). */
  authCallback: "/auth/callback",
  /** Centre d'aide public (canonique SEO). */
  help: "/help",
  helpQuickstart: "/help/quickstart",
  helpSearch: "/help/search",
  helpCategory: (category: string) => `/help/${category}` as const,
  helpArticle: (category: string, slug: string) => `/help/${category}/${slug}` as const,
  /** Legacy — redirection vers /help. */
  aide: "/aide",
  /** Hub administration plateforme. */
  dashboardAdmin: "/dashboard/admin",
  /** Backoffice articles aide (v2). */
  dashboardHelpAdmin: "/dashboard/admin/help",
  /** Backoffice FAQ publique. */
  dashboardAdminFaq: "/dashboard/admin/faq",
  /** Administration des comptes utilisateur. */
  dashboardAdminUsers: "/dashboard/admin/users",
  /** Administration des comptes de demonstration. */
  dashboardAdminDemo: "/dashboard/admin/demo",
} as const;

/** Hub conducteur et sous-routes (scan QR, etc.). */
export function isTerrainPath(pathname: string): boolean {
  return pathname === ROUTE_PATHS.terrain || pathname.startsWith(`${ROUTE_PATHS.terrain}/`);
}
