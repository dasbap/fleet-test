import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MobileHomePage from "@/pages/mobile/MobileHomePage";
import Drivers from "@/pages/Drivers";
import ShiftClosure from "@/pages/ShiftClosure";
import Incidents from "@/pages/Incidents";
import Maintenance from "@/pages/Maintenance";
import Reports from "@/pages/Reports";
import Invitations from "@/pages/Invitations";
import Settings from "@/pages/Settings";
import Teams from "@/pages/Teams";
import CreateFleet from "@/pages/CreateFleet";
import Finances from "@/pages/Finances";
import Collections from "@/pages/Collections";
import Dashboard from "@/pages/Dashboard";
import FleetVehicleDetailPage from "@/features/fleet/screens/FleetVehicleDetailPage";
import IncidentAlertDetailPage from "@/features/alerts/screens/IncidentAlertDetailPage";
import History from "@/pages/History";
import MobileFleetPage from "@/pages/mobile/MobileFleetPage";
import MobileDriverFleetPage from "@/pages/mobile/MobileDriverFleetPage";
import MobileAlertsPage from "@/pages/mobile/MobileAlertsPage";
import MobileOperationsPage from "@/pages/mobile/MobileOperationsPage";
import OperationsMissionDetailPage from "@/pages/mobile/OperationsMissionDetailPage";
import OperationsInterventionDetailPage from "@/pages/mobile/OperationsInterventionDetailPage";
import MobileAccountPage from "@/pages/mobile/MobileAccountPage";
import { RolesHubScreen } from "@/features/roles";
import { RequireRole } from "@/navigation/guards/RequireRole";
import {
  DASHBOARD_BACKOFFICE_ROLES,
  DASHBOARD_COLLECTIONS_ROLES,
  DASHBOARD_FINANCES_ROLES,
  DASHBOARD_HISTORY_ROLES,
} from "@/navigation/dashboardRouteRoles";
import DeclareIncidentPage from "@/pages/mobile/DeclareIncidentPage";

/**
 * Arbre de routes sous `/dashboard` : layout commun + écrans métier (web + mobile natif).
 * Navigation mobile (onglets) : Accueil → index, Flotte → vehicles ou my-vehicle,
 * Alertes, Opérations, Compte → profile (voir `mobileTabs.ts` + `BottomTabBar`).
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
