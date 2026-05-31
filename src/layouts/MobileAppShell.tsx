import { lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { BottomTabBar } from "@/components/mobile/BottomTabBar";
import type { AppRole } from "@/hooks/useAuth";
import { useMobileTabTracking } from "@/hooks/mobile/useMobileTabTracking";
import { getMobileOutletShellClass } from "@/lib/mobileOutletShellClass";
import { cn } from "@/lib/utils";
import { ActivationBanner } from "@/components/shared/ActivationBanner";
import { DriverTerrainActivationModal } from "@/components/activation/DriverTerrainActivationModal";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { useDriverTerrainActivation } from "@/hooks/useDriverTerrainActivation";

const NotificationsPermissionGate = lazy(() =>
  import("@/components/notifications/NotificationsPermissionGate").then((module) => ({
    default: module.NotificationsPermissionGate,
  })),
);

export interface MobileAppShellProps {
  userRole: AppRole | null;
}

/**
 * Coque native partagée : bannières, zone scroll, outlet, barre d’onglets.
 * Utilisée par {@link MobileLayout} (dashboard) et {@link TerrainLayout} (/terrain).
 */
export function MobileAppShell({ userRole }: MobileAppShellProps) {
  useMobileTabTracking();
  const { pathname } = useLocation();
  const outletShellClass = getMobileOutletShellClass(pathname);
  const { shouldShowModal, isLoading: terrainModalLoading } = useDriverTerrainActivation();
  const hideTabBar = shouldShowModal && !terrainModalLoading;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <ActivationBanner />
      <DriverTerrainActivationModal />
      <OfflineBanner />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-safe">
        <div
          className={cn(
            "min-h-full px-4 py-5 pb-5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] transition-colors duration-200 sm:px-5",
            outletShellClass,
          )}
        >
          <Suspense fallback={null}>
            <NotificationsPermissionGate />
          </Suspense>
          <Suspense fallback={<RoutePageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      {!hideTabBar ? <BottomTabBar userRole={userRole} /> : null}
    </div>
  );
}
