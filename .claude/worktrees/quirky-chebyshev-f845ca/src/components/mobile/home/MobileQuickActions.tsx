import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileFormLabelOverline } from "@/lib/mobile/mobileUiTokens";

export interface QuickActionItem {
  to: string;
  label: string;
  description?: string;
  icon: LucideIcon;
}

interface MobileQuickActionsProps {
  actions: QuickActionItem[];
  className?: string;
}

/**
 * Bandeau d’actions rapides (tap large, hiérarchie claire).
 */
export function MobileQuickActions({ actions, className }: MobileQuickActionsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h2 className={mobileFormLabelOverline}>Actions rapides</h2>
      <ul className="flex flex-col gap-2.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.to}>
              <Link
                to={action.to}
                className={cn(
                  "flex min-h-[3.25rem] items-center gap-3 rounded-xl border border-border/90 bg-card p-3.5",
                  "shadow-sm transition-colors active:bg-muted/60 touch-manipulation",
                  "outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-tight">{action.label}</span>
                  {action.description ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  ) : null}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
