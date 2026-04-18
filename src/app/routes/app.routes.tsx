import { lazy } from "react";
import { Route, Navigate, useParams } from "react-router-dom";
import AuthProviderLayout from "@/components/auth/AuthProviderLayout";
import { dashboardRoutes } from "@/app/routes/dashboard.routes";
import { authPublicRoutes } from "@/features/auth/routes";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const Index = lazy(() => import("@/pages/Index"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AidePage = lazy(() => import("@/pages/Aide"));
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
const PostLoginGate = lazy(() => import("@/pages/PostLoginGate"));

/** Ancien lien /aide/videos/:id → tuto dashboard (le paramètre doit être interpolé, pas littéral). */
function RedirectLegacyAideVideoToTutorial() {
  const { tutorialId } = useParams<{ tutorialId: string }>();
  if (!tutorialId) {
    return <Navigate to="/dashboard/tutorials" replace />;
  }
  return <Navigate to={`/dashboard/tutorials/${encodeURIComponent(tutorialId)}`} replace />;
}

/**
 * Arbre de routes racine : pages publiques, redirections, dashboard, 404.
 * Monté dans `App.tsx` sous `<Routes>` (avec Suspense au niveau parent).
 */
export const appRoutes = (
  <>
    <Route path="/" element={<Index />} />
    <Route path="/aide" element={<AidePage />} />
    <Route
      path="/aide/videos"
      element={<Navigate to="/dashboard/tutorials" replace />}
    />
    <Route
      path="/aide/videos/:tutorialId"
      element={<RedirectLegacyAideVideoToTutorial />}
    />
    <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
    <Route
      path="/signup"
      element={<Navigate to="/auth?mode=signup" replace />}
    />
    <Route
      path="/register"
      element={<Navigate to="/auth?mode=signup" replace />}
    />
    <Route path="/connexion" element={<Navigate to={ROUTE_PATHS.auth} replace />} />
    <Route element={<AuthProviderLayout />}>
      {authPublicRoutes}
      <Route path="/onboarding" element={<OnboardingRoute />} />
      <Route path="/start" element={<TenantBootstrapRoute />} />
      <Route path="/post-login" element={<PostLoginGate />} />
      {dashboardRoutes}
    </Route>
    <Route path="*" element={<NotFound />} />
  </>
);
