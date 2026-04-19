import { lazy, Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { ActivationBanner } from "@/components/shared/ActivationBanner";
import { DriverTerrainActivationModal } from "@/components/activation/DriverTerrainActivationModal";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { isNativePlatform } from "@/lib/platform";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { MobileAppShell } from "@/layouts/MobileAppShell";

const NotificationsPermissionGate = lazy(() =>
  import("@/components/notifications/NotificationsPermissionGate").then((module) => ({
    default: module.NotificationsPermissionGate,
  })),
);

/**
 * Layout conducteur terrain : sans sidebar admin sur le web ; sur Capacitor, même coque que le dashboard (onglets).
 */
export default function TerrainLayout() {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const userRole = role ?? "driver";
  const isTerrainScan = pathname === ROUTE_PATHS.terrainScan;

  if (isNativePlatform()) {
    return <MobileAppShell userRole={userRole} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ActivationBanner />
      <DriverTerrainActivationModal />
      <OfflineBanner />
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {isTerrainScan ? (
              <Button variant="ghost" size="sm" className="shrink-0 gap-1 px-2" asChild>
                <Link to={ROUTE_PATHS.terrain}>
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Retour
                </Link>
              </Button>
            ) : null}
            <h1 className="truncate font-heading text-lg font-semibold tracking-tight">
              {isTerrainScan ? "Scanner QR" : "Terrain"}
            </h1>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
            <Link to={ROUTE_PATHS.dashboardProfile}>
              <User className="h-4 w-4" aria-hidden />
              Compte
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-5">
        <Suspense fallback={null}>
          <NotificationsPermissionGate />
        </Suspense>
        <Suspense fallback={<RoutePageFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
