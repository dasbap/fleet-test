import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
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
  CreditCard,
  KeyRound,
  Mic,
  Video,
} from "lucide-react";
import { signOut } from "@/lib/auth-actions";
import { toast } from "@/hooks/use-toast";
import { hasModuleAccess } from "@/auth/permissions";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import {
  DASHBOARD_NAV,
  DASHBOARD_SIDEBAR_FOOTER,
  filterDashboardNavByPlan,
  isDashboardNavActive,
  type DashboardNavItem,
} from "@/config/navigation";
import type { AppRole } from "@/types/auth";
import { useAuth } from "@/hooks/useAuth";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";

interface DashboardSidebarProps {
  userRole: AppRole;
}

interface SidebarNavItem extends DashboardNavItem {
  icon: LucideIcon;
}

const DASHBOARD_NAV_ICONS: Record<string, LucideIcon> = {
  [ROUTE_PATHS.dashboard]: LayoutDashboard,
  [ROUTE_PATHS.dashboardVehicles]: Car,
  [ROUTE_PATHS.dashboardIncidents]: Wrench,
  [ROUTE_PATHS.dashboardMaintenance]: Fuel,
  [ROUTE_PATHS.dashboardOperations]: LayoutGrid,
  [ROUTE_PATHS.dashboardTeams]: Users,
  [ROUTE_PATHS.dashboardDrivers]: Users,
  [ROUTE_PATHS.dashboardDriverScores]: Users,
  [ROUTE_PATHS.dashboardInvitations]: Ticket,
  [ROUTE_PATHS.dashboardReports]: BarChart3,
  [ROUTE_PATHS.dashboardTracking]: Map,
  [ROUTE_PATHS.dashboardGeofencing]: MapPin,
  [ROUTE_PATHS.dashboardScheduledReports]: CalendarClock,
  [ROUTE_PATHS.dashboardFinances]: DollarSign,
  [ROUTE_PATHS.dashboardCollections]: DollarSign,
  [ROUTE_PATHS.dashboardBilling]: CreditCard,
  [ROUTE_PATHS.dashboardAlerts]: Bell,
  [ROUTE_PATHS.dashboardCoaching]: Mic,
  [ROUTE_PATHS.dashboardDashcam]: Video,
  [ROUTE_PATHS.dashboardMyVehicle]: Car,
  [ROUTE_PATHS.dashboardShiftClosure]: DollarSign,
  [ROUTE_PATHS.dashboardHistory]: Fuel,
  [ROUTE_PATHS.dashboardRetentionAnalytics]: LineChart,
  [ROUTE_PATHS.dashboardRoles]: Shield,
  [ROUTE_PATHS.dashboardAdmin]: Shield,
  [ROUTE_PATHS.dashboardAdminUsers]: Shield,
  [ROUTE_PATHS.dashboardAdminDemo]: KeyRound,
  [ROUTE_PATHS.dashboardAdminFaq]: Shield,
  [ROUTE_PATHS.dashboardHelpAdmin]: Shield,
};

function withIcons(items: readonly DashboardNavItem[]): SidebarNavItem[] {
  return items.map((item) => ({
    ...item,
    icon: DASHBOARD_NAV_ICONS[item.href] ?? LayoutDashboard,
  }));
}

function buildOrganizerMenu(userRole: AppRole, planOptions: {
  financeEnabled: boolean;
  reportsEnabled: boolean;
}): SidebarNavItem[] {
  const core = filterDashboardNavByPlan(DASHBOARD_NAV.organizer, planOptions);
  const extras: DashboardNavItem[] = [];

  if (hasModuleAccess(userRole, "retention_analytics")) {
    extras.push(DASHBOARD_NAV.organizerExtras.retention);
  }
  if (hasModuleAccess(userRole, "roles_sidebar_link")) {
    extras.push(DASHBOARD_NAV.organizerExtras.roles);
  }

  return withIcons([...core, ...extras]);
}

const DashboardSidebar = ({ userRole }: DashboardSidebarProps) => {
  const location = useLocation();
  const { userFleetId } = useAuth();
  const { isAdmin } = useRoleAccess();
  const billingQuery = useFleetBillingContext(userFleetId ?? undefined);
  const planOptions = {
    financeEnabled:
      billingQuery.isError || billingQuery.data?.financeEnabled !== false,
    reportsEnabled:
      billingQuery.isError || billingQuery.data?.reportsEnabled !== false,
  };

  const menuItems: Record<AppRole, SidebarNavItem[]> = {
    organizer: buildOrganizerMenu(userRole, planOptions),
    manager: withIcons(filterDashboardNavByPlan(DASHBOARD_NAV.manager, planOptions)),
    driver: withIcons(DASHBOARD_NAV.driver),
    mechanic: withIcons(DASHBOARD_NAV.mechanic),
  };

  const items = isAdmin ? withIcons(DASHBOARD_NAV.admin) : menuItems[userRole];
  const footerLinks = isAdmin
    ? DASHBOARD_SIDEBAR_FOOTER.filter((link) => link.href === ROUTE_PATHS.dashboardProfile)
    : DASHBOARD_SIDEBAR_FOOTER;

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, x: -8 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-base leading-none text-sidebar-foreground">E-Samba</span>
            <span className="text-[10px] text-sidebar-foreground/50 leading-none mt-0.5 font-medium tracking-wide">Smart Fleet Africa</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] tracking-widest font-semibold uppercase px-3 mb-1">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <motion.div variants={containerVariants} initial="hidden" animate="show">
                {items.map((item) => {
                  const isActive = isDashboardNavActive(location.pathname, item.href);
                  return (
                    <motion.div key={`${item.href}-${item.label}`} variants={itemVariants}>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={isActive ? "bg-primary/15 text-primary font-semibold" : "hover:bg-sidebar-accent"}
                        >
                          <Link
                            to={item.href}
                            aria-current={isActive ? "page" : undefined}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg"
                          >
                            <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-sidebar-foreground/60"}`} />
                            <span className="text-sm">{item.label}</span>
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-active-pill"
                                className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                              />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </motion.div>
                  );
                })}
              </motion.div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {footerLinks.map((link) => {
            const isActive = location.pathname === link.href;
            const Icon = link.href === ROUTE_PATHS.dashboardProfile ? User : Settings;
            return (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link
                    to={link.href}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
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
