import { lazy } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { RequireRole } from "@/navigation/guards/RequireRole";
import {
  DASHBOARD_BACKOFFICE_ROLES,
  DASHBOARD_COLLECTIONS_ROLES,
  DASHBOARD_FINANCES_ROLES,
  DASHBOARD_HISTORY_ROLES,
} from "@/navigation/dashboardRouteRoles";

const MobileHomePage = lazy(() => import("@/pages/mobile/MobileHomePage"));
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
const MobileFleetPage = lazy(() => import("@/pages/mobile/MobileFleetPage"));
const MobileDriverFleetPage = lazy(() => import("@/pages/mobile/MobileDriverFleetPage"));
const MobileAlertsPage = lazy(() => import("@/pages/mobile/MobileAlertsPage"));
const MobileOperationsPage = lazy(() => import("@/pages/mobile/MobileOperationsPage"));
const OperationsMissionDetailPage = lazy(
  () => import("@/pages/mobile/OperationsMissionDetailPage")
);
const OperationsInterventionDetailPage = lazy(
  () => import("@/pages/mobile/OperationsInterventionDetailPage")
);
const MobileAccountPage = lazy(() => import("@/pages/mobile/MobileAccountPage"));
const RolesHubScreen = lazy(() =>
  import("@/features/roles").then((m) => ({ default: m.RolesHubScreen }))
);
const DeclareIncidentPage = lazy(() => import("@/pages/mobile/DeclareIncidentPage"));

/**
 * Arbre de routes sous `/dashboard` : layout commun + écrans métier (web + mobile natif).
 * Chaque écran est chargé à la demande (code-splitting) pour réduire le bundle initial.
 */
export function DashboardRouteGroup() {
  return (
    <Route path="/dashboard" element={<ProtectedRoute />}>
      <Route element={<DashboardLayout />}>
        <Route index element={<MobileHomePage />} />
        <Route path="vehicles/:vehicleId" element={<FleetVehicleDetailPage />} />
        <Route path="vehicles" element={<MobileFleetPage />} />
        <Route
          path="drivers"
          element={
            <RequireRole allow={DASHBOARD_BACKOFFICE_ROLES}>
              <Drivers />
            </RequireRole>
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
            <RequireRole allow={DASHBOARD_BACKOFFICE_ROLES}>
              <Teams />
            </RequireRole>
          }
        />
        <Route path="create-fleet" element={<CreateFleet />} />
        <Route
          path="finances"
          element={
            <RequireRole allow={DASHBOARD_FINANCES_ROLES}>
              <Finances />
            </RequireRole>
          }
        />
        <Route
          path="collections"
          element={
            <RequireRole allow={DASHBOARD_COLLECTIONS_ROLES}>
              <Collections />
            </RequireRole>
          }
        />
        <Route path="alerts/:alertId" element={<IncidentAlertDetailPage />} />
        <Route path="alerts" element={<MobileAlertsPage />} />
        <Route path="operations/mission/:missionId" element={<OperationsMissionDetailPage />} />
        <Route
          path="operations/intervention/:ticketId"
          element={<OperationsInterventionDetailPage />}
        />
        <Route path="operations" element={<MobileOperationsPage />} />
        <Route
          path="roles"
          element={
            <RequireRole allow={["organizer", "manager"]}>
              <RolesHubScreen />
            </RequireRole>
          }
        />
        <Route path="my-vehicle" element={<MobileDriverFleetPage />} />
        <Route
          path="history"
          element={
            <RequireRole allow={DASHBOARD_HISTORY_ROLES}>
              <History />
            </RequireRole>
          }
        />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Route>
  );
}
