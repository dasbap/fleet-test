import { Navigate, Outlet } from 'react-router-dom';
import { RequireAuth } from '@/navigation/guards/RequireAuth';
import { PageLoader } from '@/components/dashboard/PageLoader';
import { useRouteAccess } from '@/hooks/useRouteAccess';

/**
 * Garde principale dashboard :
 * - authentification
 * - vérification de l'état d'onboarding via service/repository
 */
export function ProtectedRoute() {
  const access = useRouteAccess();

  return (
    <RequireAuth>
      {access.state === 'loading' && <PageLoader />}
      {access.state === 'unauth' && <Navigate to="/auth" replace />}
      {access.state === 'onboarding' && <Navigate to="/start" replace />}
      {access.state === 'ready' && <Outlet />}
    </RequireAuth>
  );
}
