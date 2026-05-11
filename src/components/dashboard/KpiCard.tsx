import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: number | string;
  delta?: { value: number; label: string };
  status?: "danger" | "warning" | "success" | "neutral";
  actionHint?: string;
  selected?: boolean;
  icon?: LucideIcon;
  onClick: () => void;
}

const statusConfig = {
  danger:  { value: "text-red-500 dark:text-red-400",         gradient: "from-red-500/8 to-transparent",         border: "border-red-500/25" },
  warning: { value: "text-amber-500 dark:text-amber-400",     gradient: "from-amber-500/8 to-transparent",       border: "border-amber-500/25" },
  success: { value: "text-emerald-500 dark:text-emerald-400", gradient: "from-emerald-500/8 to-transparent",     border: "border-emerald-500/25" },
  neutral: { value: "text-foreground",                         gradient: "from-primary/6 to-transparent",         border: "border-transparent" },
};

export function KpiCard({
  label,
  value,
  delta,
  status = "neutral",
  actionHint,
  selected,
  icon: Icon,
  onClick,
}: Props) {
  const cfg = statusConfig[status];

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "group text-left rounded-2xl p-5 border w-full",
        "bg-card bg-gradient-to-br",
        cfg.gradient,
        "shadow-sm hover:shadow-md transition-all duration-200",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : cn("hover:border-primary/30", cfg.border),
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase trac