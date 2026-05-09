import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  label: string;
  value: number;
  delta?: { value: number; label: string };
  status?: "danger" | "warning" | "success" | "neutral";
  actionHint?: string;
  selected?: boolean;
  onClick: () => void;
}

const statusColors = {
  danger: "text-red-500  dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-slate-900 dark:text-slate-100",
};

export function KpiCard({
  label,
  value,
  delta,
  status = "neutral",
  actionHint,
  selected,
  onClick,
}: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group text-left bg-surface-raised rounded-card p-4 border-[1.5px] transition-colors",
        selected
          ? "border-brand"
          : "border-transparent hover:border-surface-raised"
      )}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={cn(
          "text-[22px] font-medium leading-none",
          statusColors[status]
        )}
      >
        {value.toLocaleString("fr-FR")}
      </p>

      {delta && (
        <p className="text-xs mt-1 flex items-center gap-1">
          <span
            className={delta.value > 0 ? "text-red-500" : "text-emerald-600"}
          >
            {delta.value > 0 ? "↑" : "↓"} {Math.abs(delta.value)}
          </span>
          <span className="text-slate-400">{delta.label}</span>
        </p>
      )}

      {actionHint && (
        <p className="text-xs text-brand mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {actionHint}
        </p>
      )}
    </button>
  );
}
