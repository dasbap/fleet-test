import { Outlet } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { useAuth } from "@/hooks/useAuth";

export function AuthenticatedDashboardLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <RoutePageFallback />;
  }

  if (!user) {
    return <Outlet />;
  }

  return <DashboardLayout />;
}
