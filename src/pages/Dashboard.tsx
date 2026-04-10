import { lazy, Suspense, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardKpis } from "@/hooks/useDashboardStats";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AlertRow } from "@/components/dashboard/AlertRow";
import { ActivityFeedSkeleton } from "@/components/dashboard/ActivityFeedSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/mobile/ui";
import { useAuth } from "@/hooks/useAuth";
import { Car } from "lucide-react";

type Filter = "all" | "critical" | "maintenance" | "overdue";
const FleetTable = lazy(() =>
  import("@/components/dashboard/FleetTable").then((module) => ({
    default: module.FleetTable,
  }))
);
const ActivityFeed = lazy(() =>
  import("@/components/dashboard/ActivityFeed").then((module) => ({
    default: module.ActivityFeed,
  }))
);
const FunnelTelemetryCard = lazy(() =>
  import("@/components/dashboard/FunnelTelemetryCard").then((module) => ({
    default: module.FunnelTelemetryCard,
  }))
);

export default function DashboardPage() {
  const navigate = useNavigate();
  const { orgId, isLoading: authLoading } = useAuth();
  const { alerts, loading: alertsLoading, resolveAlert } = useDashboard(orgId ?? "");
  const { data: kpis, isLoading: kpisLoading } = useDashboardKpis();
  const [filter, setFilter] = useState<Filter>("all");
  const valueActivatedPct = useMemo(() => {
    if (!kpis) return 0;
    const score = Math.min(
      100,
      Math.max(0, kpis.activeVehicles * 25 + kpis.inMaintenance * 10 + (kpis.overdueServices === 0 ? 25 : 0)),
    );
    return score;
  }, [kpis]);

  const filtered = alerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "critical") return a.severity === "critical";
    if (filter === "maintenance")
      return ["oil", "revision", "brakes"].includes(a.type);
    if (filter === "overdue") return a.type === "ct";
    return true;
  });

  if (authLoading || alertsLoading || kpisLoading || !kpis) return <DashboardSkeleton />;

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

      <div className="rounded-card border border-surface-raised bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Valeur activée</p>
            <p className="text-xs text-slate-500">Progression vers une flotte pleinement opérationnelle.</p>
          </div>
          <p className="text-sm font-semibold">{valueActivatedPct}%</p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised">
          <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${valueActivatedPct}%` }} />
        </div>
      </div>

      <Suspense fallback={<FunnelTelemetryCardSkeleton />}>
        <FunnelTelemetryCard />
      </Suspense>

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

      {kpis.activeVehicles === 0 ? (
        <div className="rounded-card border border-surface-raised bg-surface p-2">
          <EmptyState
            icon={Car}
            title="Ajouter mon véhicule"
            description="Ajoutez un premier véhicule pour activer le suivi, les alertes realtime et les actions en 1 clic."
            actionLabel="Ajouter mon véhicule"
            onAction={() => navigate("/dashboard/vehicles")}
          />
        </div>
      ) : null}

      {/* Section basse */}
      <div className="grid grid-cols-2 gap-4">
        <Suspense fallback={<FleetColumnSkeleton />}>
          <FleetTable orgId={orgId} />
        </Suspense>
        <Suspense fallback={<ActivityFeedSkeleton />}>
          <ActivityFeed orgId={orgId} />
        </Suspense>
      </div>
    </div>
  );
}

/** Aligné sur {@link FleetOverview} (chargement) pour limiter le CLS. */
function FleetColumnSkeleton() {
  return (
    <Card className="h-full min-h-[26rem]">
      <CardHeader>
        <CardTitle className="font-heading">Aperçu de la flotte</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg bg-muted/30 p-4">
              <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelTelemetryCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Suivi funnel (30 jours)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-48" />
      </CardContent>
    </Card>
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

      <div className="rounded-card border border-surface-raised bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="h-5 w-10" />
        </div>
        <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
      </div>

      <FunnelTelemetryCardSkeleton />

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
        <FleetColumnSkeleton />
        <ActivityFeedSkeleton />
      </div>
    </div>
  );
}
