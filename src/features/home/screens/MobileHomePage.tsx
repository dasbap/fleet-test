import { lazy, Suspense } from "react";
import { isNativePlatform } from "@/lib/platform";
import { RoutePageFallback } from "@/components/RoutePageFallback";

const MobileHomeDashboard = lazy(() =>
  import("@/components/mobile/home/MobileHomeDashboard").then((m) => ({
    default: m.MobileHomeDashboard,
  })),
);

const Dashboard = lazy(() => import("@/pages/Dashboard"));

/** Accueil : dashboard mobile natif ou vue actionnable web. */
export default function MobileHomePage() {
  if (isNativePlatform()) {
    return (
      <Suspense fallback={<RoutePageFallback />}>
        <MobileHomeDashboard />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<RoutePageFallback />}>
      <Dashboard />
    </Suspense>
  );
}
