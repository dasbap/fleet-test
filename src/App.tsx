import * as Sentry from "@sentry/react";
import { PageSEO } from "@/components/PageSEO";
import Providers from "@/components/Providers";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Drivers from "./pages/Drivers";
import ShiftClosure from "./pages/ShiftClosure";
import Incidents from "./pages/Incidents";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";
import Invitations from "./pages/Invitations";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Teams from "./pages/Teams";
import CreateFleet from "./pages/CreateFleet";
import Finances from "./pages/Finances";
import Collections from "./pages/Collections";
import Alerts from "./pages/Alerts";
import Roles from "./pages/Roles";
import MyVehicle from "./pages/MyVehicle";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

const App = () => (
  <Sentry.ErrorBoundary
    fallback={({ resetError }) => (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground text-center">
          Une erreur est survenue. Veuillez recharger la page.
        </p>
        <button
          type="button"
          onClick={() => (resetError ? resetError() : window.location.reload())}
          className="text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
        >
          Recharger la page
        </button>
      </div>
    )}
  >
    <Providers>
      <BrowserRouter>
        <PageSEO />
        <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="closure" element={<ShiftClosure />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="reports" element={<Reports />} />
            <Route path="invitations" element={<Invitations />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="teams" element={<Teams />} />
            <Route path="create-fleet" element={<CreateFleet />} />
            <Route path="finances" element={<Finances />} />
            <Route path="collections" element={<Collections />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="roles" element={<Roles />} />
            <Route path="my-vehicle" element={<MyVehicle />} />
            <Route path="history" element={<History />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </Providers>
  </Sentry.ErrorBoundary>
);

export default App;
