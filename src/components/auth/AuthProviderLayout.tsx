import { lazy, Suspense } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthProvider";
import { AnalyticsUserSync } from "@/components/analytics/AnalyticsUserSync";
import { useAuth } from "@/hooks/useAuth";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const PushNotificationBridge = lazy(() =>
  import("@/components/mobile/PushNotificationBridge").then((module) => ({
    default: module.PushNotificationBridge,
  }))
);
const OfflinePendingSyncBridge = lazy(() =>
  import("@/components/OfflinePendingSyncBridge").then((module) => ({
    default: module.OfflinePendingSyncBridge,
  }))
);
const BiometricLockBridge = lazy(() =>
  import("@/components/mobile/BiometricLockBridge").then((module) => ({
    default: module.BiometricLockBridge,
  }))
);

/**
 * Intercepte le flux PASSWORD_RECOVERY sur n'importe quelle route.
 * Sans ce garde, le lien email peut atterrir sur /start ou /dashboard
 * et l'aiguillage normal s'applique avant que le formulaire ne s'affiche.
 */
function PasswordRecoveryGuard() {
  const { isPasswordRecovery } = useAuth();
  const location = useLocation();

  if (
    isPasswordRecovery &&
    location.pathname !== ROUTE_PATHS.updatePassword
  ) {
    return <Navigate to={ROUTE_PATHS.updatePassword} replace />;
  }

  return null;
}

/**
 * Sous-arbre nécessitant l'authentification applicative.
 * Permet de différer le chargement Supabase/Auth sur les routes publiques.
 */
export default function AuthProviderLayout() {
  return (
    <AuthProvider>
      <AnalyticsUserSync />
      {/* Garde global reset-password — prioritaire sur tout autre aiguillage */}
      <PasswordRecoveryGuard />
      <Suspense fallback={null}>
        <PushNotificationBridge />
        <OfflinePendingSyncBridge />
        <BiometricLockBridge />
      </Suspense>
      <Outlet />
    </AuthProvider>
  );
}
