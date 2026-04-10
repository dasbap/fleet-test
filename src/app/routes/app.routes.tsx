import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { dashboardRoutes } from "@/app/routes/dashboard.routes";
import { authPublicRoutes } from "@/features/auth";
import { OnboardingRoute } from "@/components/auth/OnboardingRoute";

const Index = lazy(() => import("@/pages/Index"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * Arbre de routes racine : pages publiques, redirections, dashboard, 404.
 * Monté dans `App.tsx` sous `<Routes>` (avec Suspense au niveau parent).
 */
export const appRoutes = (
  <>
    <Route path="/" element={<Index />} />
    {authPublicRoutes}
    <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
    <Route path="/onboarding" element={<OnboardingRoute />} />
    {dashboardRoutes}
    <Route path="*" element={<NotFound />} />
  </>
);
