import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { dashboardRoutes } from "@/app/DashboardRouteGroup";
import { RequireGuest } from "@/navigation/guards/RequireGuest";

const Index = lazy(() => import("@/pages/Index"));
const Auth = lazy(() => import("@/features/auth/screens/AuthPage"));
const MobileLoginScreen = lazy(() => import("@/features/auth/screens/MobileLoginScreen"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * Arbre de routes racine : pages publiques, redirections, dashboard, 404.
 * Monté dans `App.tsx` sous `<Routes>` (avec Suspense au niveau parent).
 */
export const appRoutes = (
  <>
    <Route path="/" element={<Index />} />
    <Route
      path="/login"
      element={
        <RequireGuest>
          <MobileLoginScreen />
        </RequireGuest>
      }
    />
    <Route
      path="/auth"
      element={
        <RequireGuest>
          <Auth />
        </RequireGuest>
      }
    />
    <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
    {dashboardRoutes}
    <Route path="*" element={<NotFound />} />
  </>
);
