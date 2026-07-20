// ============================================================
// FICHIER : src/components/dashboard/sidebar.tsx
// Sidebar de navigation principale
// ============================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  MapPin,
  Settings,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: "alerts";
};

const navigation: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Principal",
    items: [
      { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
      {
        name: "Alertes",
        href: "/dashboard/alertes",
        icon: Bell,
        badge: "alerts",
      },
    ],
  },
  {
    label: "Gestion",
    items: [
      { name: "Flottes", href: "/dashboard/flottes", icon: MapPin },
      { name: "Véhicules", href: "/dashboard/vehicules", icon: Truck },
      { name: "Conducteurs", href: "/dashboard/conducteurs", icon: Users },
      { name: "Documents", href: "/dashboard/documents", icon: FileText },
      { name: "Entretien", href: "/dashboard/entretien", icon: Wrench },
    ],
  },
  {
    label: "Finance",
    items: [
      { name: "Dépenses", href: "/dashboard/depenses", icon: CreditCard },
      { name: "Rapports", href: "/dashboard/rapports", icon: BarChart3 },
      { name: "Abonnement", href: "/dashboard/abonnement", icon: CreditCard },
    ],
  },
  {
    label: "Compte",
    items: [
      { name: "Paramètres", href: "/dashboard/parametres", icon: Settings },
    ],
  },
];

interface SidebarProps {
  alertCount?: number;
}

export function Sidebar({ alertCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "gap-3",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Truck className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="text-sm font-bold">E-Samba</p>
            <p className="text-xs text-muted-foreground">Gestion de flotte</p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
        {navigation.map((section) => (
          <div key={section.label}>
            {!collapsed ? (
              <p className="mb-1 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {section.label}
              </p>
            ) : null}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                        collapsed && "justify-center px-2",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          isActive && "text-primary",
                        )}
                      />
                      {!collapsed ? (
                        <span className="flex-1">{item.name}</span>
                      ) : null}
                      {!collapsed &&
                      item.badge === "alerts" &&
                      alertCount > 0 ? (
                        <Badge
                          variant="destructive"
                          className="ml-auto h-5 px-1.5 text-xs"
                        >
                          {alertCount > 99 ? "99+" : alertCount}
                        </Badge>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Développer la sidebar" : "Réduire la sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="mr-2 h-4 w-4" />
              <span className="text-xs">Réduire</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

/** @deprecated Utiliser Sidebar */
export const DashboardSidebar = Sidebar;
