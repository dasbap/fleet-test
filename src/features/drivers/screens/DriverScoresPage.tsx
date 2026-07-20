import { Award, RefreshCw, TrendingUp, Users, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useDriverScores, useCalculateDriverScore, type DriverScore } from "@/hooks/useDriverScores";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  mobileScreenRootList,
  mobileScreenStack,
  mobileScreenSubtitle,
  mobileScreenTitle,
} from "@/lib/mobile/mobileUiTokens";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_CONFIG = {
  green: {
    label: "Excellent",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    barClass: "bg-emerald-500",
  },
  orange: {
    label: "Moyen",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    barClass: "bg-orange-500",
  },
  red: {
    label: "À risque",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    barClass: "bg-red-500",
  },
} as const;

function ScoreBar({ value, barClass }: { value: number | null; barClass: string }) {
  const pct = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums w-6 text-right text-muted-foreground">
        {value != null ? Math.round(value) : "—"}
      </span>
    </div>
  );
}

// ─── Driver score card ────────────────────────────────────────────────────────

function DriverScoreCard({
  score,
  rank,
  onRecalculate,
  isPending,
}: {
  score: DriverScore;
  rank: number;
  onRecalculate: () => void;
  isPending: boolean;
}) {
  const cfg = LEVEL_CONFIG[score.score_level];
  const driverName = score.driver?.full_name ?? "Conducteur inconnu";
  const total = score.score_total != null ? Math.round(score.score_total) : "—";
  const updatedAt = new Date(score.last_calculated_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              rank === 1
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{driverName}</p>
            <p className="text-xs text-muted-foreground">Mis à jour le {updatedAt}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cfg.badgeClass}>{cfg.label}</Badge>
            <span className="text-xl font-bold tabular-nums">{total}</span>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="space-y-1.5">
          {[
            { label: "Incidents", value: score.incidents_score },
            { label: "Clôtures", value: score.closure_delay_score },
            { label: "Discipline", value: score.shift_discipline_score },
            { label: "Stabilité", value: score.operational_stability_score },
          ].map(({ label, value }) => (
            <div key={label} className="grid grid-cols-[80px_1fr] items-center gap-2">
              <span className="text-xs text-muted-foreground truncate">{label}</span>
              <ScoreBar value={value} barClass={cfg.barClass} />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1.5"
            onClick={onRecalculate}
            disabled={isPending}
          >
            <RefreshCw className={cn("h-3 w-3", isPending && "animate-spin")} />
            Recalculer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function ScoreSummary({ scores }: { scores: DriverScore[] }) {
  const green = scores.filter((s) => s.score_level === "green").length;
  const orange = scores.filter((s) => s.score_level === "orange").length;
  const red = scores.filter((s) => s.score_level === "red").length;

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Excellents", count: green, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900" },
        { label: "Moyens", count: orange, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900" },
        { label: "À risque", count: red, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900" },
      ].map(({ label, count, color, bg }) => (
        <Card key={label} className={cn("border", bg)}>
          <CardContent className="py-3 text-center">
            <p className={cn("text-2xl font-bold", color)}>{count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DriverScoresPage() {
  const { userFleetId, isLoading: authLoading } = useAuth();
  const { data: scores = [], isLoading } = useDriverScores();
  const { mutate: recalculate, isPending: recalcPending, variables: recalcVars } =
    useCalculateDriverScore();

  const sorted = [...scores].sort(
    (a, b) => (b.score_total ?? 0) - (a.score_total ?? 0),
  );

  if (authLoading || isLoading) return <PageLoader />;

  return (
    <div className={cn(mobileScreenRootList, mobileScreenStack)}>
      <header className="space-y-1.5">
        <h1 className={cn(mobileScreenTitle, "flex items-center gap-2.5")}>
          <Award className="h-7 w-7 shrink-0 text-yellow-500" aria-hidden />
          <span>Scores conducteurs</span>
        </h1>
        <p className={mobileScreenSubtitle}>
          Classement des conducteurs par score de performance (incidents, clôtures, discipline).
        </p>
      </header>

      {sorted.length > 0 && <ScoreSummary scores={sorted} />}

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
            <Info className="h-8 w-8" />
            <p className="text-sm">Aucun score calculé pour cette flotte.</p>
            <p className="text-xs">
              Les scores sont calculés automatiquement après 7 jours d'activité ou à la demande.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sorted.map((score, i) => (
            <li key={score.id}>
              <DriverScoreCard
                score={score}
                rank={i + 1}
                onRecalculate={() =>
                  userFleetId &&
                  recalculate({ driverUserId: score.driver_user_id, fleetId: userFleetId })
                }
                isPending={
                  recalcPending &&
                  recalcVars?.driverUserId === score.driver_user_id
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
