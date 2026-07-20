import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileKpiVariant = "default" | "success" | "warning" | "destructive";

const variantStyles: Record<MobileKpiVariant, string> = {
  default: "border-border bg-card",
  success: "border-success/30 bg-success/5",
  warning: "border-warning/40 bg-warning/5",
  destructive: "border-destructive/35 bg-destructive/5",
};

interface MobileKpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  variant?: MobileKpiVariant;
  className?: string;
}

/**
 * Carte KPI compacte pour le dashboard mobile (lecture rapide).
 */
export function MobileKpiCard({
  icon: Icon,
  label,
  value,
  variant = "default",
  className,
}: MobileKpiCardProps) {
  return (
    <div
      className={cn(
        "flex min-h-[104px] flex-col justify-between gap-2 rounded-xl border border-border/90 bg-card p-4 shadow-sm",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium leading-snug text-muted-foreground">{label}</span>
        <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      </div>
      <p className="font-heading text-[1.65rem] font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
