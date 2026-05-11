import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { RootLayout } from "@/app/RootLayout";
import AuthProviderLayout from "@/components/auth/AuthProviderLayout";
import { dashboardRoutes } from "@/app/routes/dashboard.routes";
import { authPublicRoutes } from "@/features/auth/routes";
import { RoleGuard } from "@/navigation/guards/RequireRole";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { LegacyAideVideoRedirect } from "@/app/routes/LegacyAideVideoRedirect";

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
const Upgrade = lazy(() => import("@/pages/Upgrade"));
const ProtectedRoute = lazy(() =>
  import("@/components/layout/ProtectedRoute").then((m) => ({ default: m.ProtectedRoute })),
);
const TerrainLayout = lazy(() => import("@/layouts/TerrainLayout"));
const TerrainPage = lazy(() => import("@/features/terrain/screens/TerrainPage"));
const Scan = lazy(() => import("@/pages/Scan"));
const FuelMonitoringPage = lazy(
  () => import("@/features/fuel/screens/FuelMonitoringPage")
);
const DvirInspectionsPage = lazy(
  () => import("@/features/inspections/screens/DvirInspectionsPage")
);
const DvirChecklistPage = lazy(
  () => import("@/features/inspections/screens/DvirChecklistPage")
);
const DvirDetailPage = lazy(
  () => import("@/features/inspections/screens/DvirDetailPage")
);
const TransitCemacPage = lazy(
  () => import("@/features/transit/screens/TransitCemacPage")
);
const TransitDetailPage = lazy(
  () => import("@/features/transit/screens/TransitDetailPage")
);
const SecuritePage = lazy(() => import('@/pages/Securite'));
const CookiesPage = lazy(() => import('@/pages/Cookies'));
const PredictiveMaintenancePage = lazy(
  () => import("@/features/maintenance/screens/PredictiveMaintenancePage")
);

/**
 * Arbre de routes racine : pages publiques, redirections, dashboard, 404.
 * Monté dans `App.tsx` sous `<Routes>` (avec Suspense au niveau parent).
 */
export const appRoutes = (
  <Route element={<RootLayout />}>
    <Route path="/" element={<Index />} />
    <Route path="/aide" element={<AidePage />} />
    <Route path="/fuel" element={<FuelMonitoringPage />} />
    <Route path="/inspections/nouveau" element={<DvirChecklistPage />} />
    <Route path="/inspections/:dvirId/modifier" element={<DvirChecklistPage />} />
    <Route path="/inspections" element={<DvirInspectionsPage />} />
    <Route path="/inspections/*" element={<DvirDetailPage />} />
    <Route path="/transit" element={<TransitCemacPage />} />
    <Route path="/transit/*" element={<TransitDetailPage />} />
    <Route
      path="/maintenance/predictive"
      element={<PredictiveMaintenancePage />}
    />
    <Route
      path="/aide/videos"
      element={<Navigate to="/dashboard/tutorials" replace />}
    />
    <Route
      path="/aide/videos/:tutorialId"
      element={<LegacyAideVideoRedirect />}
    />
    <Route path="/securite" element={<SecuritePage />} />
    <Route path="/cookies" element={<CookiesPage />} />
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
      <Route path="/terrain" element={<ProtectedRoute />}>
        <Route element={<TerrainLayout />}>
          <Route
            index
            element={
              <RoleGuard allow={["driver"]}>
                <TerrainPage />
              </RoleGuard>
            }
          />
          <Route
            path="scan"
            element={
              <RoleGuard allow={["driver"]}>
                <Scan />
              </RoleGuard>
            }
          />
        </Route>
      </Route>
      <Route
        path="/maintenance"
        element={<Navigate to={ROUTE_PATHS.dashboardMaintenance} replace />}
      />
      <Route path="/upgrade" element={<Upgrade />} />
      <Route path="/post-login" element={<PostLoginGate />} />
      {dashboardRoutes}
    </Route>
    <Route path="*" element={<NotFound />} />
  </Route>
);
