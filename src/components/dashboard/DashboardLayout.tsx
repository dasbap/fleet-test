import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { NotificationsPermissionGate } from "@/components/notifications/NotificationsPermissionGate";
import { useAuth } from "@/hooks/useAuth";
import { isNativePlatform } from "@/lib/platform";
import MobileLayout from "@/layouts/MobileLayout";

/**
 * Layout commun pour toutes les pages dashboard : sidebar, header et zone de contenu (Outlet).
 * Sous Capacitor : coque mobile à onglets (sans sidebar).
 */
export default function DashboardLayout() {
  const { user, role } = useAuth();
  const userRole = role || "organizer";
  const userMetadata = user?.user_metadata || {};
  const rawFromMeta = userMetadata.full_name;
  const nameFromMeta =
    typeof rawFromMeta === "string" && rawFromMeta.trim() !== ""
      ? rawFromMeta.trim()
      : undefined;
  const fullName =
    nameFromMeta ?? user?.email?.split("@")[0] ?? "Utilisateur";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (isNativePlatform()) {
    return <MobileLayout userRole={role} />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar userRole={userRole} />
        <SidebarInset className="flex flex-col flex-1">
          <DashboardHeader
            userRole={userRole}
            displayName={fullName}
            initials={initials}
          />
          <main className="flex-1 p-6 overflow-auto">
            <NotificationsPermissionGate />
            <Suspense fallback={<RoutePageFallback />}>
              <Outlet />
            </Suspense>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
