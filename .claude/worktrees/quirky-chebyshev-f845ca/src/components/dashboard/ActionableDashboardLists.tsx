import { useState } from "react";
import { CheckCircle2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { DashboardAlert } from "@/types/dashboard";
import type { MaintenanceJob } from "@/hooks/useMaintenance";

const PRIORITY_LABEL: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  critical: "Critique",
};

function daysFromNow(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function jobTitle(job: MaintenanceJob) {
  const raw = job.notes?.trim() || job.incident?.description?.trim();
  if (raw) return raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
  return "Intervention planifiée";
}

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

export interface ActionableDashboardListsProps {
  alerts: DashboardAlert[];
  scheduledJobs: MaintenanceJob[];
  onResolveAlert: (id: string, action: DashboardAlert["action"]) => Promise<void>;
  onNavigateAlerts: () => void;
  onNavigateMaintenance: () => void;
  onNavigateVehicle: (vehicleId: string) => void;
  onPlanAlert: (alert: DashboardAlert) => void;
  onPlanJob: (job: MaintenanceJob) => void;
}

/**
 * Blocs secondaires alertes + entretiens (chunk séparé pour INP : moins de JS sur le premier rendu).
 */
export function ActionableDashboardLists({
  alerts,
  scheduledJobs,
  onResolveAlert,
  onNavigateAlerts,
  onNavigateMaintenance,
  onNavigateVehicle,
  onPlanAlert,
  onPlanJob,
}: ActionableDashboardListsProps) {
  return (
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
                onPlan={onPlanAlert}
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
                onPlan={onPlanJob}
                onViewVehicle={onNavigateVehicle}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
