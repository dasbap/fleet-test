import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { RootLayout } from "@/app/RootLayout";
import AuthProviderLayout from "@/components/auth/AuthProviderLayout";
import { dashboardRoutes } from "@/app/routes/dashboard.routes";
import { authPublicRoutes } from "@/features/auth/routes";
import { RoleGuard } from "@/navigation/guards/RequireRole";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { LANDING_CTA, PUBLIC_DEMO_HREF } from "@/config/navigation";
import { LegacyAideVideoRedirect } from "@/app/routes/LegacyAideVideoRedirect";
import { DEMO_FEATURE_ENABLED } from "@/lib/demo/demoFeatureFlag";
import { useAuth } from "@/hooks/useAuth";

const Index = lazy(() => import("@/pages/Index"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const HelpPublicLayout = lazy(() =>
  import("@/features/help/components/HelpPublicLayout").then((m) => ({
    default: m.HelpPublicLayout,
  })),
);
const HelpHomePage = lazy(() => import("@/features/help/screens/HelpHomePage"));
const HelpQuickStartPage = lazy(() => import("@/features/help/screens/HelpQuickStartPage"));
const HelpCategoryPage = lazy(() => import("@/features/help/screens/HelpCategoryPage"));
const HelpArticlePage = lazy(() => import("@/features/help/screens/HelpArticlePage"));
const HelpSearchPage = lazy(() => import("@/features/help/screens/HelpSearchPage"));
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
const ConfidentialitePage = lazy(() => import('@/pages/Confidentialite'));
const ConditionsPage = lazy(() => import('@/pages/Conditions'));
const AproposPage = lazy(() => import('@/pages/Apropos'));
const BlogPage = lazy(() => import('@/pages/Blog'));
const ResourcesIndexPage = lazy(() => import('@/pages/resources/ResourcesIndexPage'));
const SeoIaHubPage = lazy(() => import('@/pages/resources/SeoIaHubPage'));
const SeoIaArticlePage = lazy(() => import('@/pages/resources/SeoIaArticlePage'));
const UseCaseHubPage = lazy(() => import('@/pages/UseCaseHub'));
const UseCaseDetailPage = lazy(() => import('@/pages/UseCaseDetail'));
const CarrieresPage = lazy(() => import('@/pages/Carrieres'));
const PartenairesPage = lazy(() => import('@/pages/Partenaires'));
const StatusPage = lazy(() => import('@/pages/Status'));
const PredictiveMaintenancePage = lazy(
  () => import("@/features/maintenance/screens/PredictiveMaintenancePage")
);
const PricingPage = lazy(() => import("@/pages/Pricing"));
const FonctionnalitesPage = lazy(() => import("@/pages/public/FonctionnalitesPage"));
const ModulesPage = lazy(() => import("@/pages/public/ModulesPage"));
const FaqPage = lazy(() => import("@/pages/public/FaqPage"));
const ContactPage = lazy(() => import("@/pages/public/ContactPage"));
const DemoMagicLinkPage = DEMO_FEATURE_ENABLED
  ? lazy(() => import("@/pages/DemoMagicLinkPage"))
  : null;
const ProspectOnboarding = DEMO_FEATURE_ENABLED
  ? lazy(() =>
      import("@/features/demo/ProspectOnboarding").then((m) => ({ default: m.ProspectOnboarding }))
    )
  : null;
const UpdatePasswordPage = lazy(() =>
  import("@/features/auth/screens/UpdatePasswordPage")
);
const AuthCallbackPage = lazy(() =>
  import("@/features/auth/screens/AuthCallbackPage")
);

function AuthAwareIndex() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (user) {
    return <Navigate to={ROUTE_PATHS.dashboard} replace />;
  }

  return <Index />;
}

/**
 * Arbre de routes racine : pages publiques, redirections, dashboard, 404.
 * Monté dans `App.tsx` sous `<Routes>` (avec Suspense au niveau parent).
 */
export const appRoutes = (
  <Route element={<RootLayout />}>
    <Route element={<HelpPublicLayout />}>
      <Route path="/help" element={<HelpHomePage />} />
      <Route path="/help/quickstart" element={<HelpQuickStartPage />} />
      <Route path="/help/faq" element={<Navigate to={ROUTE_PATHS.faq} replace />} />
      <Route path="/help/guides" element={<Navigate to={ROUTE_PATHS.helpQuickstart} replace />} />
      <Route path="/help/search" element={<HelpSearchPage />} />
      <Route path="/help/:category/:slug" element={<HelpArticlePage />} />
      <Route path="/help/:category" element={<HelpCategoryPage />} />
    </Route>
    <Route path="/aide" element={<Navigate to="/help" replace />} />
    <Route path="/aide/*" element={<Navigate to="/help" replace />} />
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
    <Route path="/fonctionnalites" element={<FonctionnalitesPage />} />
    <Route path="/modules" element={<ModulesPage />} />
    <Route path="/faq" element={<FaqPage />} />
    <Route path="/guides" element={<Navigate to={ROUTE_PATHS.help} replace />} />
    <Route path="/features" element={<Navigate to={ROUTE_PATHS.fonctionnalites} replace />} />
    <Route path="/contact" element={<ContactPage />} />
    <Route path="/demo" element={<Navigate to={PUBLIC_DEMO_HREF} replace />} />
    <Route path="/pricing" element={<PricingPage />} />
    <Route path="/tarifs" element={<Navigate to={ROUTE_PATHS.pricing} replace />} />
    <Route path="/cookies" element={<CookiesPage />} />
    <Route path="/confidentialite" element={<ConfidentialitePage />} />
    <Route path="/privacy" element={<Navigate to="/confidentialite" replace />} />
    <Route path="/conditions" element={<ConditionsPage />} />
    <Route path="/terms" element={<Navigate to="/conditions" replace />} />
    <Route path="/apropos" element={<AproposPage />} />
    <Route path="/blog" element={<BlogPage />} />
    <Route path="/ressources" element={<ResourcesIndexPage />} />
    <Route path="/ressources/seo-ia" element={<SeoIaHubPage />} />
    <Route path="/ressources/seo-ia/*" element={<SeoIaArticlePage />} />
    <Route path="/use-case" element={<UseCaseHubPage />} />
    <Route path="/use-case/:slug" element={<UseCaseDetailPage />} />
    <Route path="/carrieres" element={<CarrieresPage />} />
    <Route path="/partenaires" element={<PartenairesPage />} />
    <Route path="/documentation" element={<Navigate to={ROUTE_PATHS.help} replace />} />
    <Route path="/api" element={<Navigate to={ROUTE_PATHS.help} replace />} />
    <Route
      path="/vehicles/new"
      element={<Navigate to={ROUTE_PATHS.dashboardVehiclesNew} replace />}
    />
    <Route
      path="/team/invite"
      element={<Navigate to={ROUTE_PATHS.dashboardInvitations} replace />}
    />
    <Route path="/status" element={<StatusPage />} />
    <Route path="/settings" element={<Navigate to={ROUTE_PATHS.dashboardSettings} replace />} />
    <Route
      path="/signup"
      element={<Navigate to={LANDING_CTA.signupHref} replace />}
    />
    <Route
      path="/register"
      element={<Navigate to={LANDING_CTA.signupHref} replace />}
    />
    <Route
      path="/inscription"
      element={<Navigate to={LANDING_CTA.signupHref} replace />}
    />
    <Route path="/connexion" element={<Navigate to={ROUTE_PATHS.auth} replace />} />
    <Route element={<AuthProviderLayout />}>
      <Route path="/" element={<AuthAwareIndex />} />
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
      {/* Flux commercial démo — pas de ProtectedRoute (auth via magic link) */}
      {DEMO_FEATURE_ENABLED && DemoMagicLinkPage && ProspectOnboarding ? (
        <>
          <Route path="/demo/access"     element={<DemoMagicLinkPage />} />
          <Route path="/demo/onboarding" element={<ProspectOnboarding />} />
        </>
      ) : (
        <>
          <Route path="/demo/access"     element={<Navigate to={PUBLIC_DEMO_HREF} replace />} />
          <Route path="/demo/onboarding" element={<Navigate to={PUBLIC_DEMO_HREF} replace />} />
        </>
      )}
      {/* Flux reset password — session temporaire PASSWORD_RECOVERY, sans RequireGuest */}
      <Route path="/auth/update-password" element={<UpdatePasswordPage />} />
      {/* Callback Supabase PKCE — magic link, confirmation email */}
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      {dashboardRoutes}
    </Route>
    <Route path="*" element={<NotFound />} />
  </Route>
);
