import { Navigate, useLocation } from 'react-router-dom';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { PageLoader } from '@/components/dashboard/PageLoader';
import { RequireAuth } from '@/navigation/guards/RequireAuth';
import { useRouteAccess } from '@/hooks/useRouteAccess';
import { useAuth } from "@/hooks/useAuth";
import { getLoginPathPreservingReturn } from "@/navigation/loginRedirectPath";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/**
 * Route dédiée à l'onboarding.
 * - Si l'onboarding est terminé: redirection vers le dashboard.
 * - Sinon: affichage du wizard.
 */
export function OnboardingRoute() {
  const access = useRouteAccess();
  const { orgId } = useAuth();
  const location = useLocation();
  const loginWithReturn = getLoginPathPreservingReturn(location);

  return (
    <RequireAuth>
      {access.state === 'loading' && <PageLoader />}
      {access.state === 'unauth' && <Navigate to={loginWithReturn} replace />}
      {access.state === "tenant_bootstrap" && (
        <Navigate to={ROUTE_PATHS.tenantBootstrap} replace />
      )}
      {access.state === "onboarding" && !orgId && (
        <Navigate to={ROUTE_PATHS.tenantBootstrap} replace />
      )}
      {access.state === "upgrade" && (
        <Navigate to={ROUTE_PATHS.upgrade} replace />
      )}
      {access.state === "ready" && (
        <Navigate to={ROUTE_PATHS.dashboard} replace />
      )}
      {access.state === "onboarding" && orgId && <OnboardingWizard />}
    </RequireAuth>
  );
}
