import * as React from "react";
import { cn } from "@/lib/utils";

type MobileBadgeVariant = "default" | "success" | "warning" | "danger" | "info";

export interface MobileBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: MobileBadgeVariant;
  icon?: React.ReactNode;
}

const variantClasses: Record<MobileBadgeVariant, string> = {
  default:
    "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  danger:
    "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

export const MobileBadge: React.FC<MobileBadgeProps> = ({
  className,
  variant = "default",
  icon,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
};

