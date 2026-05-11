import { motion } from "framer-motion";
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
  CreditCard,
  Mic,
  Video,
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
  { icon: CreditCard, label: "Abonnement", href: ROUTE_PATHS.dashboardBilling },
  { icon: Bell, label: "Alertes", href: ROUTE_PATHS.dashboardAlerts },
  { icon: Mic, label: "Coaching vocal", href: ROUTE_PATHS.dashboardCoaching },
  { icon: Video, label: "Dashcam AI", href: ROUTE_PATHS.dashboardDashcam },
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
      { icon: CreditCard, label: "Abonnement", href: ROUTE_PATHS.dashboardBilling },
      { icon: Bell, label: "Alertes", href: ROUTE_PATHS.dashboardAlerts },
      { icon: Mic, label: "Coaching vocal", href: ROUTE_PATHS.dashboardCoaching },
      { icon: Video, label: "Dashcam AI", href: ROUTE_PATHS.dashboardDashcam },
    ]),
    driver: [
      { icon: LayoutDashboard, label: "Mon tableau", href: "/dashboard" },
      { icon: Car, label: "Mon véhicule", href: "/dashboard/my-vehicle" },
      { icon: DollarSign, label: "Clôture", href: "/dashboard/closure" },
      { icon: Wrench, label: "Signaler", href: "/dashboard/incidents" },
      { icon: Mic, label: "Coaching vocal", href: ROUTE_PATHS.dashboardCoaching },
    ],
    mechanic: [
      { icon: LayoutDashboard, label: "Interventions", href: "/dashboard/maintenance" },
      { icon: Wrench, label: "Incidents", href: "/dashboard/incidents" },
      { icon: Car, label: "Véhicules", href: "/dashboard/vehicles" },
      { icon: Fuel, label: "Historique", href: "/dashboard/history" },
    ],
  };

  const items = menuItems[userRole];

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
                  const isActive = location.pathname === item.href;
                  return (
                    <motion.div key={item.href} variants={itemVariants}>
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
      