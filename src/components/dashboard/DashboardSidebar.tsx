import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Zap,
  LayoutDashboard,
  Car,
  Fuel,
  Wrench,
  DollarSign,
  Users,
  User,
  Bell,
  LayoutGrid,
  Settings,
  LogOut,
  BarChart3,
  LineChart,
  Shield,
  Ticket,
  Map,
  MapPin,
  CalendarClock,
} from "lucide-react";
import { signOut } from "@/lib/auth-actions";
import { toast } from "@/hooks/use-toast";
import { hasModuleAccess } from "@/auth/permissions";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import type { AppRole } from "@/types/auth";
import { ActivationChecklist } from "@/components/shared/ActivationChecklist";
import { useAuth } from "@/hooks/useAuth";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";

interface DashboardSidebarProps {
  userRole: AppRole;
}

const organizerNavCore = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: ROUTE_PATHS.dashboard },
  { icon: Car, label: "Véhicules", href: ROUTE_PATHS.dashboardVehicles },
  { icon: Wrench, label: "Incidents", href: ROUTE_PATHS.dashboardIncidents },
  { icon: Fuel, label: "Maintenance", href: ROUTE_PATHS.dashboardMaintenance },
  { icon: LayoutGrid, label: "Opérations", href: ROUTE_PATHS.dashboardOperations },
  { icon: Users, label: "Équipes", href: ROUTE_PATHS.dashboardTeams },
  { icon: Users, label: "Scores conducteurs", href: ROUTE_PATHS.dashboardDriverScores },
  { icon: Ticket, label: "Invitations", href: ROUTE_PATHS.dashboardInvitations },
  { icon: BarChart3, label: "Rapports", href: ROUTE_PATHS.dashboardReports },
  { icon: Map, label: "Suivi GPS", href: "/dashboard/tracking" },
  { icon: MapPin, label: "Géofencing", href: ROUTE_PATHS.dashboardGeofencing },
  { icon: CalendarClock, label: "Rapports auto", href: ROUTE_PATHS.dashboardScheduledReports },
  { icon: DollarSign, label: "Finances", href: ROUTE_PATHS.dashboardFinances },
  { icon: Bell, label: "Alertes", href: ROUTE_PATHS.dashboardAlerts },
] as const;

const organizerRetentionLink = {
  icon: LineChart,
  label: "Rétention",
  href: ROUTE_PATHS.dashboardRetentionAnalytics,
} as const;

const organizerRolesLink = {
  icon: Shield,
  label: "Rôles",
  href: "/dashboard/roles",
} as const;

const FINANCE_NAV_HREFS = new Set(["/dashboard/finances", "/dashboard/collections"]);
const REPORTS_NAV_HREFS = new Set(["/dashboard/reports"]);

const DashboardSidebar = ({ userRole }: DashboardSidebarProps) => {
  const location = useLocation();
  const { userFleetId } = useAuth();
  const billingQuery = useFleetBillingContext(userFleetId ?? undefined);
  const financeNavAllowed =
    billingQuery.isError || billingQuery.data?.financeEnabled !== false;
  const reportsNavAllowed =
    billingQuery.isError || billingQuery.data?.reportsEnabled !== false;

  const filterByPlan = <T extends { href: string }>(items: readonly T[]): T[] =>
    items.filter((item) => {
      if (FINANCE_NAV_HREFS.has(item.href)) {
        return financeNavAllowed;
      }
      if (REPORTS_NAV_HREFS.has(item.href)) {
        return reportsNavAllowed;
      }
      return true;
    });

  const menuItems = {
    organizer: [
      ...filterByPlan(organizerNavCore),
      ...(hasModuleAccess(userRole, "retention_analytics") ? [organizerRetentionLink] : []),
      ...(hasModuleAccess(userRole, "roles_sidebar_link") ? [organizerRolesLink] : []),
    ],
    manager: filterByPlan([
      { icon: LayoutDashboard, label: "Tableau de bord", href: ROUTE_PATHS.dashboard },
      { icon: Car, label: "Véhicules", href: ROUTE_PATHS.dashboardVehicles },
      { icon: Wrench, label: "Incidents", href: ROUTE_PATHS.dashboardIncidents },
      { icon: Fuel, label: "Maintenance", href: ROUTE_PATHS.dashboardMaintenance },
      { icon: LayoutGrid, label: "Opérations", href: ROUTE_PATHS.dashboardOperations },
      { icon: Users, label: "Équipes", href: ROUTE_PATHS.dashboardTeams },
      { icon: Users, label: "Chauffeurs", href: ROUTE_PATHS.dashboardDrivers },
      { icon: Users, label: "Scores conducteurs", href: ROUTE_PATHS.dashboardDriverScores },
      { icon: Ticket, label: "Invitations", href: ROUTE_PATHS.dashboardInvitations },
      { icon: BarChart3, label: "Rapports", href: ROUTE_PATHS.dashboardReports },
      { icon: Map, label: "Suivi GPS", href: "/dashboard/tracking" },
      { icon: MapPin, label: "Géofencing", href: ROUTE_PATHS.dashboardGeofencing },
      { icon: CalendarClock, label: "Rapports auto", href: ROUTE_PATHS.dashboardScheduledReports },
      { icon: DollarSign, label: "Encaissements", href: ROUTE_PATHS.dashboardCollections },
      { icon: Bell, label: "Alertes", href: ROUTE_PATHS.dashboardAlerts },
    ]),
    driver: [
      { icon: LayoutDashboard, label: "Mon tableau", href: "/dashboard" },
      { icon: Car, label: "Mon véhicule", href: "/dashboard/my-vehicle" },
      { icon: DollarSign, label: "Clôture", href: "/dashboard/closure" },
      { icon: Wrench, label: "Signaler", href: "/dashboard/incidents" },
    ],
    mechanic: [
      { icon: LayoutDashboard, label: "Interventions", href: "/dashboard/maintenance" },
      { icon: Wrench, label: "Incidents", href: "/dashboard/incidents" },
      { icon: Car, label: "Véhicules", href: "/dashboard/vehicles" },
      { icon: Fuel, label: "Historique", href: "/dashboard/history" },
    ],
  };

  const items = menuItems[userRole];

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-lg">E-Samba</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                    >
                      <Link
                        to={item.href}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="pt-0">
          <SidebarGroupLabel>Activation</SidebarGroupLabel>
          <SidebarGroupContent>
            <ActivationChecklist mode="sidebar" className="rounded-xl" />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/dashboard/profile"}
            >
              <Link
                to="/dashboard/profile"
                aria-current={
                  location.pathname === "/dashboard/profile" ? "page" : undefined
                }
              >
                <User className="w-5 h-5" />
                <span>Mon profil</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/dashboard/settings"}
            >
              <Link
                to="/dashboard/settings"
                aria-current={
                  location.pathname === "/dashboard/settings"
                    ? "page"
                    : undefined
                }
              >
                <Settings className="w-5 h-5" />
                <span>Paramètres</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                try {
                  const { error } = await signOut();
                  if (error) throw error;
                  window.location.href = "/";
                } catch {
                  toast({
                    title: "Erreur de déconnexion",
                    description:
                      "Impossible de vous déconnecter. Réessayez ou vérifiez votre connexion.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
