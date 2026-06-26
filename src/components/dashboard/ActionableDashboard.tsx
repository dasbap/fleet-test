import { lazy, Suspense, useState } from "react";
import { Banknote, Bell, Droplets, Truck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import type { VehicleDto } from "@/types/dto/vehicle.dto";
import type { DashboardAlert, KpiSummary } from "@/types/dashboard";
import type { MaintenanceJob } from "@/hooks/useMaintenance";

/** Chargé à la demande (INP : évite le coût du planificateur sur le premier rendu du dashboard). */
const MaintenancePlannerModal = lazy(() =>
  import("@/components/maintenance/MaintenancePlannerModal").then((m) => ({
    default: m.MaintenancePlannerModal,
  })),
);

/** Listes alertes + entretiens en chunk séparé (moins de travail sur le premier rendu). */
const ActionableDashboardListsLazy = lazy(() =>
  import("@/components/dashboard/ActionableDashboardLists").then((m) => ({
    default: m.ActionableDashboardLists,
  })),
);

function formatXaf(n: number) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatAvgKm(km: number) {
  return `${km.toLocaleString("fr-FR")} km`;
}

// ── KPI Card ─────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  urgency?: "normal" | "warning" | "critical";
  action?: { label: string; onClick: () => void };
}

function KpiCard({ label, value, sub, icon, urgency = "normal", action }: KpiCardProps) {
  const urgencyStyle = {
    normal: { border: "border-surface-raised", bg: "bg-surface", text: "text-slate-100" },
    warning: { border: "border-amber-400/30", bg: "bg-amber-400/5", text: "text-amber-400" },
    critical: { border: "border-red-500/30", bg: "bg-red-500/8", text: "text-red-400" },
  }[urgency];

  return (
    <div
      className={cn(
        "rounded-card border p-4 space-y-2 transition-all",
        urgencyStyle.border,
        urgencyStyle.bg,
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs text-slate-500">{label}</p>
        <div className="text-slate-500">{icon}</div>
      </div>
      <p className={cn("text-2xl font-semibold tabular-nums", urgencyStyle.text)}>{value}</p>
      {sub && <p className="text-xs text-slate-600">{sub}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            "mt-1 w-full rounded-card border py-1.5 text-xs font-medium transition-all",
            urgency === "critical"
              ? "border-red-500/30 text-red-400 hover:bg-red-500/15"
              : urgency === "warning"
                ? "border-amber-400/30 text-amber-400 hover:bg-amber-400/15"
                : "border-brand/30 text-brand-light hover:bg-brand/15",
          )}
        >
          {action.label} →
        </button>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <Skeleton className={cn("animate-pulse rounded bg-surface-raised", className)} />;
}

/** Placeholder Suspense pour le chunk listes (même grille que le squelette page entière). */
function DashboardListsSuspenseFallback() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {[0, 1].map((col) => (
        <div key={col} className="space-y-2">
          <Sk className="h-4 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-card border border-surface-raised p-3 flex items-center gap-3"
            >
              <Sk className="h-2 w-2 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Sk className="h-3 w-3/4" />
                <Sk className="h-2.5 w-1/2" />
              </div>
              <Sk className="h-7 w-20 rounded-card" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ActionableDashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-40" />
        <Sk className="h-4 w-20" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-card border border-surface-raised bg-surface p-4 space-y-2">
            <Sk className="h-3 w-20" />
            <Sk className="h-8 w-16" />
            <Sk className="h-3 w-14" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="space-y-2">
            <Sk className="h-4 w-28" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-card border border-surface-raised p-3 flex items-center gap-3"
              >
                <Sk className="h-2 w-2 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Sk className="h-3 w-3/4" />
                  <Sk className="h-2.5 w-1/2" />
                </div>
                <Sk className="h-7 w-20 rounded-card" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export interface ActionableDashboardProps {
  kpis: KpiSummary;
  alerts: DashboardAlert[];
  scheduledJobs: MaintenanceJob[];
  avgKm: number;
  todayRevenueXaf: number;
  totalVehicles: number;
  fuelSpendXof: number;
  fuelLiters: number;
  onNavigateVehicle: (vehicleId: string) => void;
  onNavigateAlerts: () => void;
  onNavigateMaintenance: () => void;
  onResolveAlert: (id: string, action: DashboardAlert["action"]) => Promise<void>;
}

export function ActionableDashboard({
  kpis,
  alerts,
  scheduledJobs,
  avgKm,
  todayRevenueXaf,
  totalVehicles,
  fuelSpendXof,
  fuelLiters,
  onNavigateVehicle,
  onNavigateAlerts,
  onNavigateMaintenance,
  onResolveAlert,
}: ActionableDashboardProps) {
  const { userFleetId: fleetActuelleId } = useAuth();
  const [plannerVehicle, setPlannerVehicle] = useState<
    Pick<VehicleDto, "id" | "fleet_id" | "registration" | "brand" | "model"> | null
  >(null);
  const [plannerOpen, setPlannerOpen] = useState(false);

  const openPlannerForAlert = (alert: DashboardAlert) => {
    if (!fleetActuelleId) {
      onNavigateMaintenance();
      return;
    }
    const parts = alert.vehicleName.trim().split(/\s+/);
    const brand = parts[0] ?? null;
    const model = parts.length > 1 ? parts.slice(1).join(" ") : null;
    setPlannerVehicle({
      id: alert.vehicleId,
      fleet_id: fleetActuelleId,
      registration: alert.plate,
      brand,
      model,
    });
    setPlannerOpen(true);
  };

  const openPlannerForJob = (job: MaintenanceJob) => {
    if (!fleetActuelleId) {
      onNavigateMaintenance();
      return;
    }
    const v = job.vehicle;
    if (!v) {
      onNavigateMaintenance();
      return;
    }
    setPlannerVehicle({
      id: job.vehicle_id,
      fleet_id: fleetActuelleId,
      registration: v.registration,
      brand: v.brand,
      model: v.model,
    });
    setPlannerOpen(true);
  };

  const icons = {
    truck: <Truck className="h-4 w-4" strokeWidth={1.5} />,
    wrench: <Wrench className="h-4 w-4" strokeWidth={1.5} />,
    bell: <Bell className="h-4 w-4" strokeWidth={1.5} />,
    xaf: <Banknote className="h-4 w-4" strokeWidth={1.5} />,
    fuel: <Droplets className="h-4 w-4" strokeWidth={1.5} />,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-slate-100">Tableau de bord</h1>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          <span className="text-xs text-slate-500">Temps réel</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Véhicules actifs"
          value={kpis.activeVehicles}
          sub={`${totalVehicles} au total`}
          icon={icons.truck}
          action={
            kpis.inMaintenance > 0
              ? {
                  label: `${kpis.inMaintenance} en entretien`,
                  onClick: onNavigateMaintenance,
                }
              : undefined
          }
        />
        <KpiCard
          label="Alertes critiques"
          value={kpis.criticalAlerts}
          sub={`${alerts.length} alertes totales`}
          icon={icons.bell}
          urgency={kpis.criticalAlerts > 0 ? "critical" : "normal"}
          action={
            kpis.criticalAlerts > 0
              ? {
                  label: "Traiter maintenant",
                  onClick: onNavigateAlerts,
                }
              : undefined
          }
        />
        <KpiCard
          label="Entretiens en retard"
          value={kpis.overdueServices}
          sub="À planifier d'urgence"
          icon={icons.wrench}
          urgency={kpis.overdueServices > 0 ? "warning" : "normal"}
          action={
            kpis.overdueServices > 0
              ? {
                  label: "Planifier",
                  onClick: onNavigateMaintenance,
                }
              : undefined
          }
        />
        <KpiCard
          label="Revenu du jour"
          value={formatXaf(todayRevenueXaf)}
          sub={`KM moyen : ${formatAvgKm(avgKm)}`}
          icon={icons.xaf}
        />
        <KpiCard
          label="Carburant (total)"
          value={formatXaf(fuelSpendXof)}
          sub={fuelLiters > 0 ? `${fuelLiters.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} L` : "Aucune saisie"}
          icon={icons.fuel}
        />
      </div>

      <Suspense fallback={<DashboardListsSuspenseFallback />}>
        <ActionableDashboardListsLazy
          alerts={alerts}
          scheduledJobs={scheduledJobs}
          onResolveAlert={onResolveAlert}
          onNavigateAlerts={onNavigateAlerts}
          onNavigateMaintenance={onNavigateMaintenance}
          onNavigateVehicle={onNavigateVehicle}
          onPlanAlert={openPlannerForAlert}
          onPlanJob={openPlannerForJob}
        />
      </Suspense>

      {plannerVehicle ? (
        <Suspense fallback={null}>
          <MaintenancePlannerModal
            open={plannerOpen}
            onOpenChange={(open) => {
              setPlannerOpen(open);
              if (!open) setPlannerVehicle(null);
            }}
            vehicle={plannerVehicle}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
