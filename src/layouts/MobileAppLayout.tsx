import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { BottomTabBar } from "@/components/mobile/BottomTabBar";
import type { AppRole } from "@/hooks/useAuth";
import { useMobileTabTracking } from "@/hooks/mobile/useMobileTabTracking";
import { getMobileOutletShellClass } from "@/lib/mobileOutletShellClass";
import { cn } from "@/lib/utils";

interface MobileAppLayoutProps {
  userRole: AppRole | null;
}

/**
 * Coque mobile Flotte E-Samba : contenu scrollable + barre d’onglets inférieure (safe area iOS / Android).
 */
export default function MobileAppLayout({ userRole }: MobileAppLayoutProps) {
  useMobileTabTracking();
  const { pathname } = useLocation();
  const outletShellClass = getMobileOutletShellClass(pathname);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-safe">
        <div
          className={cn(
            "min-h-full px-4 py-4 pb-5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] transition-colors duration-200 sm:px-5",
            outletShellClass
          )}
        >
          <Suspense fallback={<RoutePageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <BottomTabBar userRole={userRole} />
    </div>
  );
}
