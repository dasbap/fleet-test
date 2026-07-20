import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { RoleGuard } from "@/navigation/guards/RequireRole";
import {
  DASHBOARD_BACKOFFICE_ROLES,
  DASHBOARD_COLLECTIONS_ROLES,
  DASHBOARD_FINANCES_ROLES,
  DASHBOARD_HISTORY_ROLES,
  DASHBOARD_RETENTION_ANALYTICS_ROLES,
  DASHBOARD_ROLES_HUB_ROLES,
} from "@/navigation/dashboardRouteRoles";
import { MODULE_ACCESS } from "@/navigation/dashboardRouteRoles";

const MobileHomePage = lazy(() => import("@/features/home/screens/MobileHomePage"));
const FleetVehicleDetailPage = lazy(
  () => import("@/features/fleet/screens/FleetVehicleDetailPage")
);
const Drivers = lazy(() => import("@/pages/Drivers"));
const ShiftClosure = lazy(() => import("@/pages/ShiftClosure"));
const Incidents = lazy(() => import("@/pages/Incidents"));
const Maintenance = lazy(() => import("@/pages/Maintenance"));
const Reports = lazy(() => import("@/pages/Reports"));
const FleetLiveMapPage = lazy(() => import("@/pages/FleetLiveMapPage"));
const RetentionDashboard = lazy(() =>
  import("@/features/analytics/screens/RetentionDashboard").then((m) => ({
    default: m.RetentionDashboard,
  })),
);
const Invitations = lazy(() => import("@/pages/Invitations"));
const Settings = lazy(() => import("@/pages/Settings"));
const Teams = lazy(() => import("@/pages/Teams"));
const CreateFleet = lazy(() => import("@/pages/CreateFleet"));
const DashboardNotFound = lazy(() => import("@/pages/DashboardNotFound"));
const Finances = lazy(() => import("@/pages/Finances"));
const Collections = lazy(() => import("@/pages/Collections"));
const IncidentAlertDetailPage = lazy(
  () => import("@/features/alerts/screens/IncidentAlertDetailPage")
);
const History = lazy(() => import("@/pages/History"));
const MobileFleetPage = lazy(() => import("@/features/fleet/screens/MobileFleetPage"));
const MobileDriverFleetPage = lazy(
  () => import("@/features/fleet/screens/MobileDriverFleetPage")
);
const MobileAlertsPage = lazy(() => import("@/features/alerts/screens/MobileAlertsPage"));
const MobileOperationsPage = lazy(
  () => import("@/features/operations/screens/MobileOperationsPage")
);
const OperationsMissionDetailPage = lazy(
  () => import("@/features/operations/screens/OperationsMissionDetailPage")
);
const OperationsInterventionDetailPage = lazy(
  () => import("@/features/operations/screens/OperationsInterventionDetailPage")
);
const MobileAccountPage = lazy(() => import("@/features/account/screens/MobileAccountPage"));
const TutorialsListPage = lazy(
  () => import("@/features/tutorials/screens/TutorialsListPage")
);
const TutorialPlayerPage = lazy(
  () => import("@/features/tutorials/screens/TutorialPlayerPage")
);
const RolesHubScreen = lazy(() =>
  import("@/features/roles").then((m) => ({ default: m.RolesHubScreen }))
);
const DeclareIncidentPage = lazy(
  () => import("@/features/incidents/screens/DeclareIncidentPage")
);
const FuelMonitoringPage = lazy(
  () => import("@/features/fuel/screens/FuelMonitoringPage")
);
const DriverScoresPage = lazy(
  () => import("@/features/drivers/screens/DriverScoresPage")
);
const DvirPage = lazy(
  () => import("@/features/inspections/screens/DvirPage")
);
const PredictiveMaintenancePage = lazy(
  () => import("@/features/maintenance/screens/PredictiveMaintenancePage")
);
const TransitCemacPage = lazy(
  () => import("@/features/transit/screens/TransitCemacPage")
);
const GeofencingPage = lazy(
  () => import("@/features/geofencing/screens/GeofencingPage")
);
const ScheduledReportsPage = lazy(
  () => import("@/features/reports/screens/ScheduledReportsPage")
);
const BillingPage = lazy(
  () => import("@/features/billing/screens/BillingPage")
);
const CoachingPage = lazy(
  () => import("@/features/coaching/screens/CoachingPage")
);
const DashcamPage = lazy(
  () => import("@/features/dashcam/screens/DashcamPage")
);
const Scan = lazy(() => import("@/pages/Scan"));
const DemoAdminPage = lazy(() => import("@/pages/admin/DemoAdminPage"));
const HelpAnalyticsDashboard = lazy(
  () => import("@/features/help/screens/HelpAnalyticsDashboard"),
);
const HelpAdminPage = lazy(() => import("@/features/help/screens/HelpAdminPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const DashboardLayout = lazy(() => import("@/components/dashboard/DashboardLayout"));
const ProtectedRoute = lazy(() =>
  import("@/components/layout/ProtectedRoute").then((m) => ({ default: m.ProtectedRoute })),
);

/**
 * Arbre de routes sous `/dashboard` : layout commun + écrans métier (web + mobile natif).
 * Chaque écran est chargé à la demande (code-splitting) pour réduire le bundle initial.
 *
 * Exporté comme **élément JSX** (pas comme composant) : sous React Router v6, les enfants
 * directs de `<Routes>` doivent être des `<Route>` ou `<Fragment>`, pas un composant qui
 * renvoie une `<Route>` (sinon erreur « [undefined] is not a Route »).
 */
export const dashboardRoutes = (
  <Route path="/dashboard" element={<ProtectedRoute />}>
    <Route element={<DashboardLayout />}>
      <Route index element={<MobileHomePage />} />
      <Route
        path="vehicles/new"
        element={<Navigate to={ROUTE_PATHS.dashboardVehiclesNew} replace />}
      />
      <Route path="vehicles/:vehicleId" element={<FleetVehicleDetailPage />} />
      <Route path="vehicles" element={<MobileFleetPage />} />
      <Route
        path="drivers/scores"
        element={
          <RoleGuard allow={DASHBOARD_BACKOFFICE_ROLES}>
            <DriverScoresPage />
          </RoleGuard>
        }
      />
      <Route
        path="drivers/new"
        element={<Navigate to={ROUTE_PATHS.dashboardInvitations} replace />}
      />
      <Route
        path="drivers/:driverId"
        element={<Navigate to={ROUTE_PATHS.dashboardDrivers} replace />}
      />
      <Route
        path="drivers"
        element={
          <RoleGuard allow={DASHBOARD_BACKOFFICE_ROLES}>
            <Drivers />
          </RoleGuard>
        }
      />
      <Route
        path="documents"
        element={<Navigate to={ROUTE_PATHS.dashboardAlerts} replace />}
      />
      <Route path="closure" element={<ShiftClosure />} />
      <Route path="incidents/declare" element={<DeclareIncidentPage />} />
      <Route path="incidents" element={<Incidents />} />
      <Route path="maintenance" element={<Maintenance />} />
      <Route path="reports" element={<Reports />} />
      <Route path="tracking" element={<FleetLiveMapPage />} />
      <Route
        path="analytics/retention"
        element={
          <RoleGuard allow={DASHBOARD_RETENTION_ANALYTICS_ROLES}>
            <RetentionDashboard />
          </RoleGuard>
        }
      />
      <Route path="invitations" element={<Invitations />} />
      <Route path="settings" element={<Settings />} />
      <Route path="profile" element={<MobileAccountPage />} />
      <Route
        path="teams"
        element={
          <RoleGuard allow={DASHBOARD_BACKOFFICE_ROLES}>
            <Teams />
          </RoleGuard>
        }
      />
      <Route path="create-fleet" element={<CreateFleet />} />
      <Route
        path="finances"
        element={
          <RoleGuard allow={DASHBOARD_FINANCES_ROLES}>
            <Finances />
          </RoleGuard>
        }
      />
      <Route
        path="collections"
        element={
          <RoleGuard allow={DASHBOARD_COLLECTIONS_ROLES}>
            <Collections />
          </RoleGuard>
        }
      />
      <Route path="alerts/:alertId" element={<IncidentAlertDetailPage />} />
      <Route path="alerts" element={<MobileAlertsPage />} />
      <Route path="tutorials" element={<TutorialsListPage />} />
      <Route path="tutorials/:tutorialId" element={<TutorialPlayerPage />} />
      <Route
        path="operations/mission/:missionId"
        element={
          <RoleGuard allow={MODULE_ACCESS.operations_mission_detail}>
            <OperationsMissionDetailPage />
          </RoleGuard>
        }
      />
      <Route
        path="operations/intervention/:ticketId"
        element={
          <RoleGuard allow={MODULE_ACCESS.operations_intervention_detail}>
            <OperationsInterventionDetailPage />
          </RoleGuard>
        }
      />
      <Route
        path="operations"
        element={
          <RoleGuard allow={MODULE_ACCESS.operations_hub}>
            <MobileOperationsPage />
          </RoleGuard>
        }
      />
      <Route path="scan" element={<Scan />} />
      <Route
        path="roles"
        element={
          <RoleGuard allow={DASHBOARD_ROLES_HUB_ROLES}>
            <RolesHubScreen />
          </RoleGuard>
        }
      />
      <Route path="my-vehicle" element={<MobileDriverFleetPage />} />
      <Route path="fuel" element={<FuelMonitoringPage />} />
      <Route path="inspections" element={<DvirPage />} />
      <Route path="maintenance/predictive" element={<PredictiveMaintenancePage />} />
      <Route path="transit" element={<TransitCemacPage />} />
      <Route
        path="geofencing"
        element={
          <RoleGuard allow={["organizer", "manager"]}>
            <GeofencingPage />
          </RoleGuard>
        }
      />
      <Route
        path="history"
        element={
          <RoleGuard allow={DASHBOARD_HISTORY_ROLES}>
            <History />
          </RoleGuard>
        }
      />
      <Route
        path="reports/scheduled"
        element={
          <RoleGuard allow={["organizer", "manager"]}>
            <ScheduledReportsPage />
          </RoleGuard>
        }
      />
      <Route
        path="billing"
        element={
          <RoleGuard allow={["organizer", "manager"]}>
            <BillingPage />
          </RoleGuard>
        }
      />
      <Route path="coaching" element={<CoachingPage />} />
      <Route
        path="dashcam"
        element={
          <RoleGuard allow={["organizer", "manager"]}>
            <DashcamPage />
          </RoleGuard>
        }
      />
      <Route
        path="admin/demo"
        element={<DemoAdminPage />}
      />
      <Route
        path="admin/users"
        element={<AdminUsersPage />}
      />
      <Route
        path="admin/help-analytics"
        element={
          <RoleGuard allow={["organizer"]}>
            <HelpAnalyticsDashboard />
          </RoleGuard>
        }
      />
      <Route
        path="admin/help"
        element={
          <RoleGuard allow={["organizer"]}>
            <HelpAdminPage />
          </RoleGuard>
        }
      />
      <Route path="*" element={<DashboardNotFound />} />
    </Route>
  </Route>
);
