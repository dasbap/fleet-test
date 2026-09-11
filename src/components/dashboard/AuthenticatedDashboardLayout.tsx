import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { useAuth } from "@/hooks/useAuth";

const DashboardLayout = lazy(() =>
  import("@/components/dashboard/DashboardLayout")
);

export function AuthenticatedDashboardLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <RoutePageFallback />;
  }

  if (!user) {
    return <Outlet />;
  }

  return (
    <Suspense fallback={<RoutePageFallback />}>
      <DashboardLayout />
    </Suspense>
  );
}
