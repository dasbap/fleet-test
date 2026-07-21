import { Navigate } from "react-router-dom";
import MobileHomePage from "@/features/home/screens/MobileHomePage";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ROUTE_PATHS } from "@/navigation/routePaths";

export function DashboardIndexRoute() {
  const { isAdmin, isLoading } = useRoleAccess();

  if (isLoading) return null;
  if (isAdmin) return <Navigate to={ROUTE_PATHS.dashboardAdmin} replace />;

  return <MobileHomePage />;
}
