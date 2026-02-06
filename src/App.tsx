import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute />}>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
