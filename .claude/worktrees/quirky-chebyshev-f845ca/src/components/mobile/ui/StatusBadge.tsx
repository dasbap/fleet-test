import * as React from "react";

import { cn } from "@/lib/utils";

export type StatusBadgeVariant = "success" | "warning" | "destructive" | "info" | "neutral";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant;
  size?: "sm" | "md";
}

const variantClass: Record<StatusBadgeVariant, string> = {
  success: "bg-success/15 text-success border-success/25",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  destructive: "bg-destructive/15 text-destructive border-destructive/25",
  info: "bg-info/15 text-info-foreground border-info/25",
  neutral: "bg-muted text-muted-foreground border-border/80",
};

/**
 * Pastille d’état métier (mission, véhicule, alerte) — lisible sur petit écran.
 */
export function StatusBadge({
  variant = "neutral",
  size = "sm",
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border font-medium",
        size === "sm" && "px-2 py-0.5 text-[11px] leading-tight",
        size === "md" && "px-2.5 py-1 text-xs leading-tight",
        variantClass[variant],
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
