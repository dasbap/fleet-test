import { lazy, Suspense, useState } from "react";
import { Banknote, Bell, CheckCircle2, Truck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { VehicleDto } from "@/types/dto/vehicle.dto";
import type { DashboardAlert, KpiSummary } from "@/types/dashboard";
import type { MaintenanceJob } from "@/hooks/useMaintenance";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

/** Chargé à la demande (INP : évite le coût du planificateur sur le premier rendu du dashboard). */
const MaintenancePlannerModal = lazy(() =>
  import("@/components/maintenance/MaintenancePlannerModal").then((m) => ({
    default: m.MaintenancePlannerModal,
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

function daysFromNow(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

const PRIORITY_LABEL: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  critical: "Critique",
};

function jobTitle(job: MaintenanceJob) {
  const raw = job.notes?.trim() || job.incident?.description?.trim();
  if (raw) return raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
  return "Intervention planifiée";
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

// ── Alert row ────────────────────────────────────────────────────────────

function ActionableAlertRow({
  alert,
  onResolve,
  onPlan,
  onViewVehicle,
}: {
  alert: DashboardAlert;
  onResolve: (id: string, action: DashboardAlert["action"]) => Promise<void>;
  onPlan: (alert: DashboardAlert) => void;
  onViewVehicle: (vehicleId: string) => void;
}) {
  const [resolving, setResolving] = useState(false);

  const severityConfig = {
    critical: { dot: "bg-red-500", text: "text-red-400", badge: "bg-red-500/15", label: "Critique" },
    warning: { dot: "bg-amber-400", text: "text-amber-400", badge: "bg-amber-400/15", label: "Alerte" },
    info: { dot: "bg-brand", text: "text-brand-light", badge: "bg-brand/15", label: "Info" },
  }[alert.severity];

  const handleResolve = async () => {
    setResolving(true);
    try {
      await onResolve(alert.id, alert.action);
    } catch {
      toast({
        title: "Action indisponible",
        description: "Impossible de résoudre cette alerte pour le moment.",
        variant: "destructive",
      });
    } finally {
      setResolving(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-card border p-3 transition-all",
        alert.severity === "critical" ? "border-red-500/20 bg-red-500/5" : "border-surface-raised bg-surface",
      )}
    >
      <div className={cn("h-2 w-2 rounded-full shrink-0 mt-0.5", severityConfig.dot)} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-200 truncate">{alert.message}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              severityConfig.badge,
              severityConfig.text,
            )}
          >
            {severityConfig.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onViewVehicle(alert.vehicleId)}
          className="text-[10px] text-brand-light hover:underline mt-0.5 text-left"
        >
          {alert.plate} · {alert.vehicleName}
        </button>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {alert.severity !== "info" && (
          <button
            type="button"
            onClick={() => onPlan(alert)}
            className="rounded-card border border-amber-400/30 px-2.5 py-1 text-[10px] font-medium text-amber-400 hover:bg-amber-400/15 transition"
          >
            Planifier
          </button>
        )}
        <button
          type="button"
          onClick={handleResolve}
          disabled={resolving}
          className={cn(
            "rounded-card border px-2.5 py-1 text-[10px] font-medium transition",
            "border-brand/30 text-brand-light hover:bg-brand/15",
            resolving && "opacity-50",
          )}
        >
          {resolving ? "…" : "Résoudre"}
        </button>
      </div>
    </div>
  );
}

// ── Maintenance row ────────────────────────────────────────────────────────

function ActionableMaintenanceRow({
  job,
  onPlan,
  onViewVehicle,
}: {
  job: MaintenanceJob;
  onPlan: (job: MaintenanceJob) => void;
  onViewVehicle: (vehicleId: string) => void;
}) {
  const planned = job.planned_at;
  const days = planned ? daysFromNow(planned) : null;
  const isOverdue = days !== null && days < 0;
  const isUrgent = days !== null && days >= 0 && days <= 7;

  const plate = job.vehicle?.registration ?? "—";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-card border p-3",
        isOverdue ? "border-red-500/20 bg-red-500/5" : isUrgent ? "border-amber-400/20" : "border-surface-raised",
      )}
    >
      <Wrench className="h-4 w-4 shrink-0 text-slate-400" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-200">{jobTitle(job)}</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-surface-raised text-slate-400">
            {PRIORITY_LABEL[job.priority] ?? job.priority}
          </span>
          {days !== null && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                isOverdue
                  ? "bg-red-500/15 text-red-400"
                  : isUrgent
                    ? "bg-amber-400/15 text-amber-400"
                    : "bg-surface-raised text-slate-400",
              )}
            >
              {isOverdue ? `J+${Math.abs(days)}` : `J−${days}`}
            </span>
          )}
          {days === null && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-surface-raised text-slate-400">
              À planifier
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onViewVehicle(job.vehicle_id)}
          className="text-[10px] text-brand-light hover:underline"
        >
          {plate}
        </button>
      </div>

      <button
        type="button"
        onClick={() => onPlan(job)}
        className={cn(
          "shrink-0 rounded-card border px-3 py-1 text-[10px] font-medium transition",
          isOverdue || isUrgent
            ? "border-red-500/30 text-red-400 hover:bg-red-500/15"
            : "border-brand/30 text-brand-light hover:bg-brand/15",
        )}
      >
        Planifier →
      </button>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────

function Sk({ className }: { className?: string }) {
  return <Skeleton className={cn("animate-pulse rounded bg-surface-raised", className)} />;
}

export function ActionableDashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-40" />
        <Sk className="h-4 w-20" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
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
  onNavigateVehicle,
  onNavigateAlerts,
  onNavigateMaintenance,
  onResolveAlert,
}: ActionableDashboardProps) {
  const { userFleetId } = useAuth();
  const [plannerVehicle, setPlannerVehicle] = useState<
    Pick<VehicleDto, "id" | "fleet_id" | "registration" | "brand" | "model"> | null
  >(null);
  const [plannerOpen, setPlannerOpen] = useState(false);

  const openPlannerForAlert = (alert: DashboardAlert) => {
    if (!userFleetId) {
      onNavigateMaintenance();
      return;
    }
    const parts = alert.vehicleName.trim().split(/\s+/);
    const brand = parts[0] ?? null;
    const model = parts.length > 1 ? parts.slice(1).join(" ") : null;
    setPlannerVehicle({
      id: alert.vehicleId,
      fleet_id: userFleetId,
      registration: alert.plate,
      brand,
      model,
    });
    setPlannerOpen(true);
  };

  const openPlannerForJob = (job: MaintenanceJob) => {
    if (!userFleetId) {
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
      fleet_id: userFleetId,
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-300 uppercase tracking-wider">Alertes actives</h2>
            {alerts.length > 5 && (
              <button
                type="button"
                onClick={onNavigateAlerts}
                className="text-xs text-brand-light hover:underline"
              >
                Voir toutes ({alerts.length})
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="rounded-card border border-dashed border-surface-raised p-6 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/80" aria-hidden />
              <p className="text-sm text-slate-500">Aucune alerte active</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <ActionableAlertRow
                  key={alert.id}
                  alert={alert}
                  onResolve={onResolveAlert}
                  onPlan={openPlannerForAlert}
                  onViewVehicle={onNavigateVehicle}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-300 uppercase tracking-wider">Entretiens à venir</h2>
            {scheduledJobs.length > 5 && (
              <button
                type="button"
                onClick={onNavigateMaintenance}
                className="text-xs text-brand-light hover:underline"
              >
                Voir tous
              </button>
            )}
          </div>

          {scheduledJobs.length === 0 ? (
            <div className="rounded-card border border-dashed border-surface-raised p-6 text-center">
              <Wrench className="h-8 w-8 mx-auto mb-2 text-slate-500" aria-hidden />
              <p className="text-sm text-slate-500">Aucun entretien planifié</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scheduledJobs.slice(0, 5).map((job) => (
                <ActionableMaintenanceRow
                  key={job.id}
                  job={job}
                  onPlan={openPlannerForJob}
                  onViewVehicle={onNavigateVehicle}
                />
              ))}
            </div>
          )}
        </section>
      </div>

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
