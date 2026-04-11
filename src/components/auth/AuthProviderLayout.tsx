import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthProvider";
import { AnalyticsUserSync } from "@/components/analytics/AnalyticsUserSync";

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
 * Sous-arbre nécessitant l'authentification applicative.
 * Permet de différer le chargement Supabase/Auth sur les routes publiques.
 */
export default function AuthProviderLayout() {
  return (
    <AuthProvider>
      <AnalyticsUserSync />
      <Suspense fallback={null}>
        <PushNotificationBridge />
        <OfflinePendingSyncBridge />
        <BiometricLockBridge />
      </Suspense>
      <Outlet />
    </AuthProvider>
  );
}
