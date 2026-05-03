import { useMemo, useState } from "react";
import { AlertTriangle, Brain, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, ShieldAlert, ShieldCheck, Wrench } from "lucide-react";
import { useFailurePrediction } from "@/hooks/useFailurePrediction";
import type { FailurePrediction, FailureRiskLevel } from "@/types/failure-prediction";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

// ── helpers ──────────────────────────────────────────────────────────────────

function riskColors(level: FailureRiskLevel) {
  if (level === "critical")
    return {
      border: "border-red-500/40",
      bg: "bg-red-500/10",
      badge: "bg-red-500/15 text-red-300 border-red-400/40",
      bar: "bg-red-500",
      icon: "text-red-400",
    };
  if (level === "high")
    return {
      border: "border-amber-500/40",
      bg: "bg-amber-500/10",
      badge: "bg-amber-500/15 text-amber-300 border-amber-400/40",
      bar: "bg-amber-500",
      icon: "text-amber-400",
    };
  if (level === "medium")
    return {
      border: "border-yellow-500/40",
      bg: "bg-yellow-500/10",
      badge: "bg-yellow-500/15 text-yellow-300 border-yellow-400/40",
      bar: "bg-yellow-400",
      icon: "text-yellow-400",
    };
  return {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
    bar: "bg-emerald-500",
    icon: "text-emerald-400",
  };
}

const LEVEL_LABELS: Record<FailureRiskLevel, string> = {
  critical: "Critique",
  high: "Élevé",
  medium: "Moyen",
  low: "Faible",
};

const LEVEL_ORDER: FailureRiskLevel[] = ["critical", "high", "medium", "low"];

// ── sub-components ────────────────────────────────────────────────────────────

function RiskScoreBar({ score, level }: { score: number; level: FailureRiskLevel }) {
  const colors = riskColors(level);
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-surface-raised overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-400 w-10 text-right">{score}/100</span>
    </div>
  );
}

function PredictionCard({ prediction }: { prediction: FailurePrediction }) {
  const [expanded, setExpanded] = useState(false);
  const colors = riskColors(prediction.riskLevel);

  return (
    <article
      className={`rounded-card border ${colors.border} ${colors.bg} p-4 space-y-3 transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="text-sm font-medium text-slate-200">
            Véhicule{" "}
            <span className="font-mono text-xs text-slate-400">
              {prediction.vehicleId.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <RiskScoreBar score={prediction.riskScore} level={prediction.riskLevel} />
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium ${colors.badge}`}
        >
          {LEVEL_LABELS[prediction.riskLevel]}
        </span>
      </div>

      {/* Top signal preview */}
      {prediction.topSignals.length > 0 && (
        <div className="flex items-start gap-1.5 text-xs text-slate-400">
          <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${colors.icon}`} />
          <span>{prediction.topSignals[0]}</span>
        </div>
      )}

      {/* Expand toggle */}
      {(prediction.topSignals.length > 1 || prediction.recommendedActions.length > 0) && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Moins de détails
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Plus de détails
            </>
          )}
        </button>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-3 pt-1 border-t border-surface-raised/50">
          {prediction.topSignals.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-1.5">Signaux détectés</p>
              <ul className="space-y-1">
                {prediction.topSignals.map((signal, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                    <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${colors.icon}`} />
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prediction.recommendedActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-1.5">Actions recommandées</p>
              <ul className="space-y-1">
                {prediction.recommendedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                    <Wrench className="h-3.5 w-3.5 mt-0.5 shrink-0 text-brand-light" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function SummaryCard({
  label,
  count,
  icon,
  colorClass,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  colorClass: string;
}) {
  return (
    <div className={`rounded-card border p-3 flex items-center gap-3 ${colorClass}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-xl font-bold text-slate-100">{count}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function PredictiveMaintenancePage() {
  const { userFleetId } = useAuth();
  const queryClient = useQueryClient();
  const [filterLevel, setFilterLevel] = useState<FailureRiskLevel | "all">("all");

  const { data = [], isLoading, isError, dataUpdatedAt } = useFailurePrediction();

  const sorted = useMemo(
    () => [...data].sort((a, b) => b.riskScore - a.riskScore),
    [data],
  );

  const filtered = useMemo(
    () => (filterLevel === "all" ? sorted : sorted.filter((p) => p.riskLevel === filterLevel)),
    [sorted, filterLevel],
  );

  const counts = useMemo(() => {
    const c: Record<FailureRiskLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const p of data) c[p.riskLevel]++;
    return c;
  }, [data]);

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["failure-prediction", userFleetId] });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-surface-raised px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-brand-light" />
          <div>
            <h1 className="text-sm font-semibold text-slate-100">Maintenance prédictive IA</h1>
            {lastUpdated && (
              <p className="text-[10px] text-slate-500">Mis à jour à {lastUpdated}</p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          disabled={isLoading}
          className="h-8 px-2 text-xs text-slate-400"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Summary cards */}
        {!isLoading && !isError && data.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <SummaryCard
              label="Critique"
              count={counts.critical}
              icon={<ShieldAlert className="h-5 w-5 text-red-400" />}
              colorClass="border-red-500/30 bg-red-500/5"
            />
            <SummaryCard
              label="Risque élevé"
              count={counts.high}
              icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
              colorClass="border-amber-500/30 bg-amber-500/5"
            />
            <SummaryCard
              label="Risque moyen"
              count={counts.medium}
              icon={<AlertTriangle className="h-5 w-5 text-yellow-400" />}
              colorClass="border-yellow-500/30 bg-yellow-500/5"
            />
            <SummaryCard
              label="Faible risque"
              count={counts.low}
              icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
              colorClass="border-emerald-500/30 bg-emerald-500/5"
            />
          </div>
        )}

        {/* Filter pills */}
        {!isLoading && !isError && data.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(["all", ...LEVEL_ORDER] as const).map((level) => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  filterLevel === level
                    ? "bg-brand-light text-black border-brand-light"
                    : "border-surface-raised text-slate-400 bg-transparent"
                }`}
              >
                {level === "all"
                  ? `Tous (${data.length})`
                  : `${LEVEL_LABELS[level]} (${counts[level]})`}
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-card border border-surface-raised bg-surface-raised/20 p-4 animate-pulse h-24"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="rounded-card border border-red-500/30 bg-red-500/5 p-6 text-center space-y-2">
            <ShieldAlert className="h-8 w-8 text-red-400 mx-auto" />
            <p className="text-sm text-red-300">Impossible de charger les prédictions.</p>
            <Button size="sm" variant="outline" onClick={handleRefresh} className="text-xs">
              Réessayer
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && data.length === 0 && (
          <div className="rounded-card border border-surface-raised bg-surface p-8 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <div>
              <p className="text-sm font-medium text-slate-200">Aucun risque détecté</p>
              <p className="text-xs text-slate-500 mt-1">
                Continuez les saisies maintenance et carburant pour améliorer la précision du modèle.
              </p>
            </div>
          </div>
        )}

        {/* Prediction list */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((prediction) => (
              <PredictionCard key={prediction.vehicleId} prediction={prediction} />
            ))}
          </div>
        )}

        {/* No results after filter */}
        {!isLoading && !isError && data.length > 0 && filtered.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            Aucun véhicule dans cette catégorie.
          </div>
        )}
      </div>
    </div>
  );
}
