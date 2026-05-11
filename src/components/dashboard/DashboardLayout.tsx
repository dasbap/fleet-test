import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { ActivationBanner } from "@/components/shared/ActivationBanner";
import { DriverTerrainActivationModal } from "@/components/activation/DriverTerrainActivationModal";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { HelpBubble } from "@/components/shared/HelpCenter";
import { useAuth } from "@/hooks/useAuth";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { isNativePlatform } from "@/lib/platform";
import MobileLayout from "@/layouts/MobileLayout";
import { OfflinePendingSyncBridge } from "@/components/OfflinePendingSyncBridge";
const NotificationsPermissionGate = lazy(() =>
  import("@/components/notifications/NotificationsPermissionGate").then((module) => ({
    default: module.NotificationsPermissionGate,
  }))
);

/**
 * Layout commun pour toutes les pages dashboard : sidebar, header et zone de contenu (Outlet).
 * Sous Capacitor : coque mobile à onglets (sans sidebar).
 */
export default function DashboardLayout() {
  const { user, role, userFleetId } = useAuth();
  const billingQuery = useFleetBillingContext(userFleetId ?? undefined);
  // Sans flotte : pas de requête billing → on affiche l’aide. Avec flotte : masquer pendant
  // le chargement (évite un flash sur plan free), puis selon aiEnabled une fois la query en succès.
  const hideHelpBubble =
    Boolean(userFleetId) &&
    (billingQuery.isPending ||
      (billingQuery.isSuccess && billingQuery.data?.aiEnabled === false));
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
  useRealtimeNotifications(userFleetId);

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
          <OfflinePendingSyncBridge />
          <OfflineBanner />
          <ActivationBanner />
          <DriverTerrainActivationModal />
          <main className="flex-1 p-6 md:p-8 overflow-auto bg-gradient-to-br from-background via-background to-primary/[0.03]">
            <Suspense fallback={null}>
              <NotificationsPermissionGate />
            </Suspense>
            <Suspense fallback={<RoutePageFallback />}>
              <Outlet />
            </Suspense>
          </main>
          <HelpBubble disabled={hideHelpBubble} />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
