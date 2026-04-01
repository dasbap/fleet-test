import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { BottomTabBar } from "@/components/mobile/BottomTabBar";
import { NotificationsPermissionGate } from "@/components/notifications/NotificationsPermissionGate";
import type { AppRole } from "@/hooks/useAuth";
import { useMobileTabTracking } from "@/hooks/mobile/useMobileTabTracking";
import { getMobileOutletShellClass } from "@/lib/mobileOutletShellClass";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  userRole: AppRole | null;
}

/**
 * Coque mobile Flotte E-Samba : contenu scrollable + barre d’onglets inférieure (safe area iOS / Android).
 * Montée uniquement sous Capacitor (voir DashboardLayout) : sur navigateur web, le dashboard conserve la sidebar.
 */
export default function MobileLayout({ userRole }: MobileLayoutProps) {
  useMobileTabTracking();
  const { pathname } = useLocation();
  const outletShellClass = getMobileOutletShellClass(pathname);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-safe">
        <div
          className={cn(
            "min-h-full px-4 py-5 pb-5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] transition-colors duration-200 sm:px-5",
            outletShellClass
          )}
        >
          <NotificationsPermissionGate />
          <Suspense fallback={<RoutePageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <BottomTabBar userRole={userRole} />
    </div>
  );
}
