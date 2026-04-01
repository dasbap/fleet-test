import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { RoleGuard } from "@/navigation/guards/RequireRole";
import {
  DASHBOARD_BACKOFFICE_ROLES,
  DASHBOARD_COLLECTIONS_ROLES,
  DASHBOARD_FINANCES_ROLES,
  DASHBOARD_HISTORY_ROLES,
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
const Invitations = lazy(() => import("@/pages/Invitations"));
const Settings = lazy(() => import("@/pages/Settings"));
const Teams = lazy(() => import("@/pages/Teams"));
const CreateFleet = lazy(() => import("@/pages/CreateFleet"));
const Finances = lazy(() => import("@/pages/Finances"));
const Collections = lazy(() => import("@/pages/Collections"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
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
const RolesHubScreen = lazy(() =>
  import("@/features/roles").then((m) => ({ default: m.RolesHubScreen }))
);
const DeclareIncidentPage = lazy(
  () => import("@/features/incidents/screens/DeclareIncidentPage")
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
      <Route path="vehicles/:vehicleId" element={<FleetVehicleDetailPage />} />
      <Route path="vehicles" element={<MobileFleetPage />} />
      <Route
        path="drivers"
        element={
          <RoleGuard allow={DASHBOARD_BACKOFFICE_ROLES}>
            <Drivers />
          </RoleGuard>
        }
      />
      <Route path="closure" element={<ShiftClosure />} />
      <Route path="incidents/declare" element={<DeclareIncidentPage />} />
      <Route path="incidents" element={<Incidents />} />
      <Route path="maintenance" element={<Maintenance />} />
      <Route path="reports" element={<Reports />} />
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
      <Route
        path="roles"
        element={
          <RoleGuard allow={DASHBOARD_ROLES_HUB_ROLES}>
            <RolesHubScreen />
          </RoleGuard>
        }
      />
      <Route path="my-vehicle" element={<MobileDriverFleetPage />} />
      <Route
        path="history"
        element={
          <RoleGuard allow={DASHBOARD_HISTORY_ROLES}>
            <History />
          </RoleGuard>
        }
      />
      <Route path="*" element={<Dashboard />} />
    </Route>
  </Route>
);
