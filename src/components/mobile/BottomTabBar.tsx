import { useMemo, useState } from "react";
import { QrCode } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MobileActionSheet } from "@/components/mobile/ui/MobileActionSheet";
import { OfflineSyncIndicator } from "@/components/shared/OfflineBanner";
import { hasModuleAccess } from "@/auth/permissions";
import {
  DASHBOARD_NAV,
  DASHBOARD_SIDEBAR_FOOTER,
  filterDashboardNavByPlan,
  type DashboardNavItem,
} from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/useAuth";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import {
  getMobileTabsForRole,
  isTabActive,
  type MobileTabDefinition,
} from "@/navigation/mobileTabs";
import { ROUTE_PATHS } from "@/navigation/routePaths";

interface BottomTabBarProps {
  userRole: AppRole | null;
}

function uniqueMenuItems(items: readonly DashboardNavItem[]): DashboardNavItem[] {
  const seen = new Set<string>();
  const out: DashboardNavItem[] = [];
  for (const item of items) {
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    out.push(item);
  }
  return out;
}

function buildMobileMenuItems(
  role: AppRole | null,
  planOptions: { financeEnabled: boolean; reportsEnabled: boolean },
  isAdmin: boolean,
): DashboardNavItem[] {
  const effectiveRole = role ?? "driver";
  const baseByRole: Record<AppRole, readonly DashboardNavItem[]> = {
    organizer: filterDashboardNavByPlan(DASHBOARD_NAV.organizer, planOptions),
    manager: filterDashboardNavByPlan(DASHBOARD_NAV.manager, planOptions),
    driver: DASHBOARD_NAV.driver,
    mechanic: DASHBOARD_NAV.mechanic,
  };

  const extras: DashboardNavItem[] = [];
  if (effectiveRole === "organizer") {
    if (hasModuleAccess(effectiveRole, "retention_analytics")) {
      extras.push(DASHBOARD_NAV.organizerExtras.retention);
    }
    if (hasModuleAccess(effectiveRole, "roles_sidebar_link")) {
      extras.push(DASHBOARD_NAV.organizerExtras.roles);
    }
  }

  return uniqueMenuItems([
    ...baseByRole[effectiveRole],
    ...(isAdmin
      ? [{ label: "Admin comptes", href: ROUTE_PATHS.dashboardAdminUsers }]
      : []),
    { label: "Guides", href: ROUTE_PATHS.dashboardTutorials },
    ...extras,
    ...DASHBOARD_SIDEBAR_FOOTER,
  ]);
}

/**
 * Barre d'onglets fixe en bas (Capacitor / WebView mobile).
 * Entrees : Accueil, Menu, Alertes, Compte, avec le scan au centre.
 */
export function BottomTabBar({ userRole }: BottomTabBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { userFleetId } = useAuth();
  const { isAdmin } = useRoleAccess();
  const billingQuery = useFleetBillingContext(userFleetId ?? undefined);
  const tabs = getMobileTabsForRole(userRole);
  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2);
  const scanActive = location.pathname.startsWith(ROUTE_PATHS.dashboardScan);
  const planOptions = {
    financeEnabled:
      billingQuery.isError || billingQuery.data?.financeEnabled !== false,
    reportsEnabled:
      billingQuery.isError || billingQuery.data?.reportsEnabled !== false,
  };
  const menuItems = useMemo(
    () => buildMobileMenuItems(userRole, planOptions, isAdmin),
    [isAdmin, planOptions.financeEnabled, planOptions.reportsEnabled, userRole],
  );
  const menuActions = useMemo(
    () =>
      menuItems.map((item) => ({
        id: item.href,
        label: item.label,
        onSelect: () => navigate(item.href),
      })),
    [menuItems, navigate],
  );

  const renderTab = (tab: MobileTabDefinition) => {
    const active = isTabActive(tab, location.pathname);
    const Icon = tab.icon;
    const className = cn(
      "flex min-h-[3.5rem] w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors touch-manipulation",
      active
        ? "bg-primary/12 text-primary"
        : "text-muted-foreground hover:text-foreground active:bg-muted/50",
    );
    const content = (
      <>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
            active ? "bg-primary/20 text-primary" : "bg-transparent",
          )}
        >
          <Icon
            className="h-[22px] w-[22px]"
            strokeWidth={active ? 2.25 : 2}
            aria-hidden
          />
        </span>
        <span className="w-full truncate text-center text-[11px] font-semibold leading-[1.15] tracking-tight">
          {tab.label}
        </span>
      </>
    );

    if (tab.id === "menu") {
      return (
        <li key={tab.id} className="flex min-w-0 max-w-[5.5rem] flex-1">
          <button
            type="button"
            className={className}
            aria-current={active ? "page" : undefined}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen(true)}
          >
            {content}
          </button>
        </li>
      );
    }

    return (
      <li key={tab.id} className="flex min-w-0 max-w-[5.5rem] flex-1">
        <Link
          to={tab.to}
          className={className}
          aria-current={active ? "page" : undefined}
        >
          {content}
        </Link>
      </li>
    );
  };

  return (
    <>
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "border-t border-border/70 bg-background/95 shadow-[0_-4px_24px_-8px_hsl(0_0%_0%/0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-background/88",
          "pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2",
        )}
        aria-label="Navigation principale"
      >
        <ul className="mx-auto flex max-w-lg items-end justify-between gap-0.5 px-1 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
          {leftTabs.map(renderTab)}
          <li className="relative -mt-5 flex min-w-[4.4rem] items-center justify-center">
            <button
              type="button"
              onClick={() => navigate(ROUTE_PATHS.dashboardScan)}
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary text-primary-foreground shadow-lg transition-all",
                scanActive && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
              )}
              aria-label="Scanner un code QR vehicule"
            >
              <QrCode className="h-6 w-6" aria-hidden />
              <span className="absolute -bottom-1 -right-1">
                <OfflineSyncIndicator />
              </span>
            </button>
          </li>
          {rightTabs.map(renderTab)}
        </ul>
      </nav>
      <MobileActionSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title="Navigation"
        actions={menuActions}
        cancelLabel="Fermer"
        className="z-[60]"
      />
    </>
  );
}
