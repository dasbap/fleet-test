// ============================================================
// FICHIER : src/components/dashboard/kpi-cards.tsx
// Cartes KPI : véhicules, conducteurs, alertes, dépenses
// ============================================================

import { cn, formatXAF } from "@/lib/utils";
import {
  Bell,
  FileWarning,
  Minus,
  Route,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { DashboardKpis } from "@/lib/dashboard/types";
import { EMPTY_DASHBOARD_KPIS } from "@/lib/dashboard/types";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down" | "neutral";
    isGood?: boolean;
  };
  alert?: boolean;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  alert = false,
}: KpiCardProps) {
  const trendColor =
    trend?.direction === "neutral"
      ? "text-muted-foreground"
      : trend?.direction === "up"
        ? trend?.isGood !== false
          ? "text-green-500"
          : "text-red-500"
        : trend?.isGood !== false
          ? "text-red-500"
          : "text-green-500";

  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUp
      : trend?.direction === "down"
        ? TrendingDown
        : Minus;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-5 transition-shadow hover:shadow-md",
        alert
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold tabular-nums",
              alert ? "text-destructive" : "text-foreground",
            )}
          >
            {value}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            iconBg,
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>

      {trend ? (
        <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span>
            {trend.value > 0 ? "+" : ""}
            {trend.value}% {trend.label}
          </span>
        </div>
      ) : null}
    </div>
  );
}

interface KpiGridProps {
  kpis?: DashboardKpis;
}

export function KpiGrid({ kpis = EMPTY_DASHBOARD_KPIS }: KpiGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="Véhicules actifs"
        value={kpis.active_vehicles}
        subtitle={`${kpis.total_vehicles} au total`}
        icon={Truck}
        iconColor="text-blue-500"
        iconBg="bg-blue-500/10"
      />

      <KpiCard
        title="Conducteurs actifs"
        value={kpis.active_drivers}
        subtitle={`${kpis.total_drivers} au total`}
        icon={Users}
        iconColor="text-indigo-500"
        iconBg="bg-indigo-500/10"
      />

      <KpiCard
        title="Documents expirés"
        value={kpis.expired_docs}
        subtitle={`${kpis.expiring_docs_30d} expirent dans 30j`}
        icon={FileWarning}
        iconColor={kpis.expired_docs > 0 ? "text-red-500" : "text-green-500"}
        iconBg={kpis.expired_docs > 0 ? "bg-red-500/10" : "bg-green-500/10"}
        alert={kpis.expired_docs > 0}
      />

      <KpiCard
        title="Dépenses du mois"
        value={formatXAF(kpis.expenses_this_month)}
        subtitle={`${Math.round(kpis.km_this_month).toLocaleString("fr-FR")} km parcourus`}
        icon={Wallet}
        iconColor="text-orange-500"
        iconBg="bg-orange-500/10"
      />

      <KpiCard
        title="Alertes nouvelles"
        value={kpis.new_alerts}
        subtitle="À traiter en priorité"
        icon={Bell}
        iconColor={kpis.new_alerts > 0 ? "text-red-500" : "text-green-500"}
        iconBg={kpis.new_alerts > 0 ? "bg-red-500/10" : "bg-green-500/10"}
        alert={kpis.new_alerts > 0}
      />

      <KpiCard
        title="Kilomètres ce mois"
        value={`${Math.round(kpis.km_this_month).toLocaleString("fr-FR")} km`}
        subtitle="Tous véhicules confondus"
        icon={Route}
        iconColor="text-teal-500"
        iconBg="bg-teal-500/10"
      />
    </div>
  );
}

/** @deprecated Utiliser KpiGrid */
export const KpiCards = KpiGrid;
