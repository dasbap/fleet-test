import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthProvider";

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

/**
 * Sous-arbre nécessitant l'authentification applicative.
 * Permet de différer le chargement Supabase/Auth sur les routes publiques.
 */
export default function AuthProviderLayout() {
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <PushNotificationBridge />
        <OfflinePendingSyncBridge />
      </Suspense>
      <Outlet />
    </AuthProvider>
  );
}
