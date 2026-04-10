import { useState } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AlertRow } from "@/components/dashboard/AlertRow";
import { FleetTable } from "@/components/dashboard/FleetTable";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

type Filter = "all" | "critical" | "maintenance" | "overdue";

export default function DashboardPage() {
  const { orgId, isLoading: authLoading } = useAuth();
  const { alerts, kpis, loading, resolveAlert } = useDashboard(orgId ?? "");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = alerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "critical") return a.severity === "critical";
    if (filter === "maintenance")
      return ["oil", "revision", "brakes"].includes(a.type);
    if (filter === "overdue") return a.type === "ct";
    return true;
  });

  if (authLoading || loading || !kpis) return <DashboardSkeleton />;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-medium">Tableau de bord · Flotte</h1>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-600">Temps réel</span>
        </div>
      </div>

      {/* KPIs — chaque carte filtre les alertes au clic */}
      <div className="grid grid-cols-4 gap-2.5">
        <KpiCard
          label="Véhicules actifs"
          value={kpis.activeVehicles}
          delta={{ value: kpis.deltaActive, label: "ce mois" }}
          actionHint="→ Voir toute la flotte"
          selected={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <KpiCard
          label="En maintenance"
          value={kpis.inMaintenance}
          status="warning"
          actionHint="→ Planifier les retours"
          selected={filter === "maintenance"}
          onClick={() => setFilter("maintenance")}
        />
        <KpiCard
          label="Alertes critiques"
          value={kpis.criticalAlerts}
          status={kpis.criticalAlerts > 0 ? "danger" : "success"}
          delta={{ value: kpis.deltaCritical, label: "vs. hier" }}
          actionHint="→ Traiter maintenant"
          selected={filter === "critical"}
          onClick={() => setFilter("critical")}
        />
        <KpiCard
          label="Entretiens en retard"
          value={kpis.overdueServices}
          status={kpis.overdueServices > 0 ? "danger" : "success"}
          actionHint="→ Programmer d'urgence"
          selected={filter === "overdue"}
          onClick={() => setFilter("overdue")}
        />
      </div>

      {/* Panel alertes avec filtre synchronisé aux KPIs */}
      <div className="border border-surface-raised rounded-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-surface-raised border-b border-surface-raised">
          <span className="text-sm font-medium">Alertes actives</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {filtered.length} alerte{filtered.length > 1 ? "s" : ""}
            </span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="text-xs px-2 py-1 border border-surface-raised rounded-md
                         bg-surface text-slate-700 dark:text-slate-300"
            >
              <option value="all">Toutes</option>
              <option value="critical">Critiques</option>
              <option value="maintenance">Maintenance</option>
              <option value="overdue">En retard</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-slate-400">
            Aucune alerte pour ce filtre
          </div>
        ) : (
          filtered.map((alert) => (
            <AlertRow key={alert.id} alert={alert} onResolve={resolveAlert} />
          ))
        )}
      </div>

      {/* Section basse */}
      <div className="grid grid-cols-2 gap-4">
        <FleetTable orgId={orgId} />
        <ActivityFeed orgId={orgId} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-72" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-card" />
        ))}
      </div>

      <div className="border border-surface-raised rounded-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-surface-raised border-b border-surface-raised">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
        <div className="space-y-3 p-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-60" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-80 rounded-card" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}
