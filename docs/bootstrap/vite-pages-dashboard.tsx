/**
 * Référence bootstrap — 4 pages dashboard E-Samba.
 *
 * Fichier guide (non routé). Les écrans réels sont lazy-loadés dans
 * src/app/routes/dashboard.routes.tsx
 */

export const DASHBOARD_PAGES = {
  dashboard: {
    route: "/dashboard",
    index: true,
    component: "src/features/home/screens/MobileHomePage.tsx",
    description:
      "Accueil dashboard. Web → lazy src/pages/Dashboard.tsx (KPIs, alertes clôture). " +
      "Natif Capacitor → MobileHomeDashboard.",
    hooksTypiques: ["useAuth", "useDashboardSnapshot", "useFleetActivationHealth"],
    layoutParent: "DashboardLayout",
  },

  vehicles: {
    route: "/dashboard/vehicles",
    component: "src/features/fleet/screens/MobileFleetPage.tsx",
    innerPage: "src/features/fleet/screens/FleetVehiclesListPage.tsx",
    description:
      "Liste véhicules : recherche, filtres statut, CRUD via useVehicles / VehicleService.",
    hooksTypiques: ["useVehicles", "useCreateVehicle", "useAuth"],
    roleGuard: "MODULE_ACCESS.vehicles (dashboard.routes.tsx)",
  },

  vehicleDetail: {
    route: "/dashboard/vehicles/:vehicleId",
    component: "src/features/fleet/screens/FleetVehicleDetailPage.tsx",
    description:
      "Fiche véhicule : maintenance, carburant, alertes, affectation conducteur, QR.",
    hooksTypiques: ["useVehicle", "useMaintenance", "useAuth"],
    legacyOrphelin: "src/pages/VehicleDetail.tsx — NON routé",
  },

  alerts: {
    route: "/dashboard/alerts",
    component: "src/features/alerts/screens/MobileAlertsPage.tsx",
    description:
      "Alertes automatiques + documents expirants. Temps réel via useRealtimeNotifications.",
    detailRoute: "/dashboard/alerts/:alertId",
    detailComponent: "src/features/alerts/screens/IncidentAlertDetailPage.tsx",
    hooksTypiques: ["useAutomaticAlerts", "useExpiringDocuments", "useAuth"],
  },
} as const;

/** Routes dashboard — extrait conceptuel (voir dashboard.routes.tsx pour la vérité). */
export const DASHBOARD_ROUTE_TREE = `
ProtectedRoute
  └─ DashboardLayout
       ├─ index        → MobileHomePage           (/dashboard)
       ├─ vehicles     → MobileFleetPage          (/dashboard/vehicles)
       ├─ vehicles/:id → FleetVehicleDetailPage   (/dashboard/vehicles/:vehicleId)
       └─ alerts       → MobileAlertsPage         (/dashboard/alerts)
` as const;

export type DashboardPageKey = keyof typeof DASHBOARD_PAGES;
