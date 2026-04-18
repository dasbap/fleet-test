import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { RequireAuth } from '@/navigation/guards/RequireAuth';
import { PageLoader } from '@/components/dashboard/PageLoader';
import { useRouteAccess } from '@/hooks/useRouteAccess';
import { getLoginPathPreservingReturn } from '@/navigation/loginRedirectPath';

/**
 * Garde principale dashboard :
 * - authentification
 * - vérification de l'état d'onboarding via service/repository
 */
export function ProtectedRoute() {
  const access = useRouteAccess();
  const location = useLocation();
  const loginWithReturn = getLoginPathPreservingReturn(location);

  return (
    <RequireAuth>
      {access.state === 'loading' && <PageLoader />}
      {access.state === 'unauth' && <Navigate to={loginWithReturn} replace />}
      {access.state === 'onboarding' && <Navigate to="/start" replace />}
      {access.state === 'ready' && <Outlet />}
    </RequireAuth>
  );
}
