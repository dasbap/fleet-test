import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/hooks/useAuth";
import {
  getMobileTabsForRole,
  isTabActive,
} from "@/navigation/mobileTabs";

interface BottomTabBarProps {
  userRole: AppRole | null;
}

/**
 * Barre d’onglets fixe en bas (Capacitor / WebView mobile).
 * Cinq entrées : Accueil, Flotte, Alertes, Opérations, Compte.
 */
export function BottomTabBar({ userRole }: BottomTabBarProps) {
  const location = useLocation();
  const tabs = getMobileTabsForRole(userRole);

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "border-t border-border/70 bg-background/95 shadow-[0_-4px_24px_-8px_hsl(0_0%_0%/0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-background/88",
        "pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2"
      )}
      aria-label="Navigation principale"
    >
      <ul className="mx-auto flex max-w-lg items-end justify-between gap-0.5 px-1 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
        {tabs.map((tab) => {
          const active = isTabActive(tab, location.pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.id} className="flex min-w-0 max-w-[5.5rem] flex-1">
              <Link
                to={tab.to}
                className={cn(
                  "flex min-h-[3.5rem] w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors touch-manipulation",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:text-foreground active:bg-muted/50"
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                    active ? "bg-primary/20 text-primary" : "bg-transparent"
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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
