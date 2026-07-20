import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface InfoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: LucideIcon;
  /** Variante visuelle discrète */
  variant?: "default" | "muted";
}

/**
 * Carte information dense : listes, résumés métier, pas de look « widget dashboard web ».
 */
export function InfoCard({
  title,
  icon: Icon,
  variant = "default",
  className,
  children,
  ...props
}: InfoCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        variant === "default" && "border-border/80 bg-card text-card-foreground shadow-sm",
        variant === "muted" && "border-transparent bg-muted/40 text-foreground",
        className,
      )}
      {...props}
    >
      {title || Icon ? (
        <div className="mb-3 flex items-start gap-3">
          {Icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
          ) : null}
          {title ? (
            <h3 className="min-w-0 flex-1 pt-1.5 font-heading text-sm font-semibold leading-tight">
              {title}
            </h3>
          ) : null}
        </div>
      ) : null}
      <div className="text-sm leading-relaxed text-foreground [&_p+p]:mt-2">{children}</div>
    </div>
  );
}
