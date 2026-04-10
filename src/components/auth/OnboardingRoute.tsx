import { Navigate } from 'react-router-dom';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { PageLoader } from '@/components/dashboard/PageLoader';
import { RequireAuth } from '@/navigation/guards/RequireAuth';
import { useRouteAccess } from '@/hooks/useRouteAccess';

/**
 * Route dédiée à l'onboarding.
 * - Si l'onboarding est terminé: redirection vers le dashboard.
 * - Sinon: affichage du wizard.
 */
export function OnboardingRoute() {
  const access = useRouteAccess();

  return (
    <RequireAuth>
      {access.state === 'loading' && <PageLoader />}
      {access.state === 'unauth' && <Navigate to="/auth" replace />}
      {access.state === 'ready' && <Navigate to="/dashboard" replace />}
      {access.state === 'onboarding' && <OnboardingWizard />}
    </RequireAuth>
  );
}
