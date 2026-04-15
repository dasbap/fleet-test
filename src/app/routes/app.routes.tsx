import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { dashboardRoutes } from "@/app/routes/dashboard.routes";
import { authPublicRoutes } from "@/features/auth/routes";

const Index = lazy(() => import("@/pages/Index"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AuthProviderLayout = lazy(() => import("@/components/auth/AuthProviderLayout"));
const OnboardingRoute = lazy(() =>
  import("@/components/auth/OnboardingRoute").then((module) => ({
    default: module.OnboardingRoute,
  }))
);
const TenantBootstrapRoute = lazy(() =>
  import("@/components/auth/TenantBootstrapRoute").then((module) => ({
    default: module.TenantBootstrapRoute,
  }))
);

/**
 * Arbre de routes racine : pages publiques, redirections, dashboard, 404.
 * Monté dans `App.tsx` sous `<Routes>` (avec Suspense au niveau parent).
 */
export const appRoutes = (
  <>
    <Route path="/" element={<Index />} />
    <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
    <Route element={<AuthProviderLayout />}>
      {authPublicRoutes}
      <Route path="/onboarding" element={<OnboardingRoute />} />
      <Route path="/start" element={<TenantBootstrapRoute />} />
      {dashboardRoutes}
    </Route>
    <Route path="*" element={<NotFound />} />
  </>
);
