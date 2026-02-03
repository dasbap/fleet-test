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
  Bell,
  Settings,
  LogOut,
  BarChart3,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  userRole: "organizer" | "manager" | "driver" | "mechanic";
}

const DashboardSidebar = ({ userRole }: DashboardSidebarProps) => {
  const location = useLocation();

  const menuItems = {
    organizer: [
      { icon: LayoutDashboard, label: "Tableau de bord", href: "/dashboard" },
      { icon: Car, label: "Véhicules", href: "/dashboard/vehicles" },
      { icon: Wrench, label: "Incidents", href: "/dashboard/incidents" },
      { icon: Fuel, label: "Maintenance", href: "/dashboard/maintenance" },
      { icon: Users, label: "Équipes", href: "/dashboard/teams" },
      { icon: BarChart3, label: "Rapports", href: "/dashboard/reports" },
      { icon: DollarSign, label: "Finances", href: "/dashboard/finances" },
      { icon: Bell, label: "Alertes", href: "/dashboard/alerts" },
      { icon: Shield, label: "Rôles", href: "/dashboard/roles" },
    ],
    manager: [
      { icon: LayoutDashboard, label: "Tableau de bord", href: "/dashboard" },
      { icon: Car, label: "Véhicules", href: "/dashboard/vehicles" },
      { icon: Wrench, label: "Incidents", href: "/dashboard/incidents" },
      { icon: Fuel, label: "Maintenance", href: "/dashboard/maintenance" },
      { icon: Users, label: "Chauffeurs", href: "/dashboard/drivers" },
      { icon: BarChart3, label: "Rapports", href: "/dashboard/reports" },
      { icon: DollarSign, label: "Encaissements", href: "/dashboard/collections" },
      { icon: Bell, label: "Alertes", href: "/dashboard/alerts" },
    ],
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
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                  >
                    <Link to={item.href}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/dashboard/profile">
                <Users className="w-5 h-5" />
                <span>Mon profil</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/dashboard/settings">
                <Settings className="w-5 h-5" />
                <span>Paramètres</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                const { signOut } = await import("@/hooks/useAuth");
                await signOut();
                window.location.href = "/";
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
