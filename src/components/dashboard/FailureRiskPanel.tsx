import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useMemo } from "react";
import { useFailurePrediction } from "@/hooks/useFailurePrediction";

function riskBadgeClass(level: string): string {
  if (level === "critical") return "bg-red-500/15 text-red-300 border-red-400/40";
  if (level === "high") return "bg-amber-500/15 text-amber-300 border-amber-400/40";
  if (level === "medium") return "bg-yellow-500/15 text-yellow-300 border-yellow-400/40";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-400/40";
}

export function FailureRiskPanel() {
  const { data = [], isLoading, isError } = useFailurePrediction();

  const topThree = useMemo(
    () => [...data].sort((a, b) => b.riskScore - a.riskScore).slice(0, 3),
    [data],
  );

  if (isLoading) {
    return (
      <section className="rounded-card border border-surface-raised bg-surface p-4 min-h-[14rem]">
        <p className="text-sm text-slate-400">Analyse de risque en cours...</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="rounded-card border border-red-500/30 bg-red-500/5 p-4 min-h-[14rem]">
        <p className="text-sm text-red-300">Impossible de charger la prédiction de pannes.</p>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-surface-raised bg-surface p-4 space-y-3 min-h-[14rem]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-brand-light" />
          Risques de pannes (IA légère)
        </h2>
        <span className="text-xs text-slate-500">{data.length} véhicule(s) analysé(s)</span>
      </div>

      {topThree.length === 0 ? (
        <p className="text-xs text-slate-400">
          Données insuffisantes pour estimer un risque. Continue les saisies maintenance et carburant.
        </p>
      ) : (
        <div className="space-y-2">
          {topThree.map((prediction) => (
            <article
              key={prediction.vehicleId}
              className="rounded-card border border-surface-raised/80 bg-surface-raised/20 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-slate-300">
                  Véhicule <span className="font-medium">{prediction.vehicleId.slice(0, 8)}</span>
                </div>
                <div
                  className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${riskBadgeClass(prediction.riskLevel)}`}
                >
                  {prediction.riskLevel} - {prediction.riskScore}/100
                </div>
              </div>

              {prediction.topSignals.length > 0 ? (
                <p className="text-xs text-slate-400">
                  <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                  {prediction.topSignals[0]}
                </p>
              ) : null}

              {prediction.recommendedActions.length > 0 ? (
                <p className="text-xs text-slate-300">{prediction.recommendedActions[0]}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
