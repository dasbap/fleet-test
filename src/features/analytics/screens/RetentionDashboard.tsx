/**
 * Dashboard rétention J7/J30 (vues Supabase : v_retention_kpis, v_retention_cohorts,
 * v_daily_active_users, v_activation_funnel). Accès organisateur (RLS + RoleGuard).
 */

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatRetentionDate,
  retentionHeatClass,
  retentionPct,
} from "@/lib/retention-analytics-format";
import { useRetentionAnalytics } from "@/hooks/useRetentionAnalytics";
import type { CohortRow, DauRow, FunnelRow } from "@/types/retention-analytics";

function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-surface-raised", className)} />;
}

function KpiCard({
  label,
  value,
  sub,
  color = "normal",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "normal" | "danger" | "warning" | "success";
}) {
  const textColor = {
    normal: "text-slate-100",
    danger: "text-red-400",
    warning: "text-amber-400",
    success: "text-brand-light",
  }[color];

  return (
    <div className="rounded-card bg-surface-raised p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={cn("text-2xl font-semibold tabular-nums", textColor)}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

function DauSparkline({ data }: { data: DauRow[] }) {
  const max = Math.max(...data.map((d) => d.dau), 1);
  return (
    <div className="rounded-card border border-surface-raised bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">Utilisateurs actifs / jour (30j)</p>
        <p className="text-sm font-medium text-slate-200 tabular-nums">
          {data.at(-1)?.dau ?? 0} aujourd&apos;hui
        </p>
      </div>
      <div className="flex items-end gap-0.5 h-14">
        {data.map((d, i) => {
          const h = max > 0 ? Math.max((d.dau / max) * 100, 2) : 2;
          return (
            <div
              key={i}
              className="flex-1 rounded-t transition-all"
              style={{
                height: `${h}%`,
                background: d.dau === 0 ? "var(--color-border-tertiary)" : "#10b981",
                opacity: d.dau === 0 ? 0.4 : 1,
              }}
              title={`${formatRetentionDate(d.day)} — ${d.dau} actifs`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-slate-600">
        <span>{data[0] ? formatRetentionDate(data[0].day) : "—"}</span>
        <span>Aujourd&apos;hui</span>
      </div>
    </div>
  );
}

const ROLE_COLORS: Record<string, string> = {
  driver: "#10b981",
  organizer: "#6366f1",
  manager: "#8b5cf6",
  mechanic: "#f59e0b",
};

const ROLE_LABELS: Record<string, string> = {
  driver: "Chauffeur",
  organizer: "Organisateur",
  manager: "Manager",
  mechanic: "Mécanicien",
  visitor: "Visiteur",
};

const FUNNEL_STEPS = [
  { key: "inscribed" as const, label: "Inscrits" },
  { key: "opened_shift" as const, label: "Créneau ouvert" },
  { key: "closed_shift" as const, label: "Clôture soumise" },
  { key: "validated_shift" as const, label: "Clôture validée" },
];

function FunnelChart({ data }: { data: FunnelRow[] }) {
  return (
    <div className="rounded-card border border-surface-raised bg-surface p-4 space-y-4">
      <p className="text-xs text-slate-500">Funnel d&apos;activation par rôle</p>
      {data.map((role) => {
        const color = ROLE_COLORS[role.role] ?? "#64748b";
        const label = ROLE_LABELS[role.role] ?? role.role;
        return (
          <div key={role.role}>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
              {label}
            </p>
            {FUNNEL_STEPS.map((step) => {
              const n = role[step.key];
              const p = retentionPct(n, role.inscribed);
              return (
                <div key={step.key} className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-slate-600 w-28 shrink-0">{step.label}</span>
                  <div className="flex-1 h-1.5 bg-surface-raised rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{ width: `${p}%`, background: p === 0 ? "#ef444444" : color }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 w-8 text-right tabular-nums">
                    {n}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function CohortTable({ cohorts }: { cohorts: CohortRow[] }) {
  return (
    <div className="rounded-card border border-surface-raised overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-surface-raised bg-surface-raised/50">
            {["Cohorte", "Taille", "Flottes", "Rétention J7", "Rétention J30", "Clôtures J30"].map(
              (h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left font-medium text-slate-500 text-[10px] uppercase tracking-wider"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c, i) => {
            const p7 = parseFloat(c.pct_d7);
            const p30 = parseFloat(c.pct_d30);
            return (
              <tr
                key={`${c.cohort_week}-${i}`}
                className="border-b border-surface-raised last:border-0 hover:bg-surface-raised/40 transition"
              >
                <td className="px-3 py-2.5 font-medium text-slate-300">
                  {formatRetentionDate(c.cohort_week)}
                </td>
                <td className="px-3 py-2.5 text-slate-400 tabular-nums">{c.cohort_size}</td>
                <td className="px-3 py-2.5 text-slate-400 tabular-nums">{c.fleets_in_cohort}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] tabular-nums",
                      retentionHeatClass(p7),
                    )}
                  >
                    {p7.toFixed(0)}%
                  </span>
                  <span className="ml-1.5 text-slate-600">
                    {c.retained_d7}/{c.cohort_size}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] tabular-nums",
                      retentionHeatClass(p30),
                    )}
                  >
                    {p30.toFixed(0)}%
                  </span>
                  <span className="ml-1.5 text-slate-600">
                    {c.retained_d30}/{c.cohort_size}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-400 tabular-nums">{c.total_closures_d30}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BenchmarkBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-slate-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-raised rounded overflow-hidden">
        <div className="h-full rounded" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <span
        className="text-xs font-medium tabular-nums"
        style={{ color, width: "32px", textAlign: "right" }}
      >
        {value}%
      </span>
    </div>
  );
}

export function RetentionDashboard() {
  const { data, isLoading, isError, error } = useRetentionAnalytics();

  const kpis = data?.kpis ?? null;
  const cohorts = data?.cohorts ?? [];
  const dau = data?.dau ?? [];
  const funnel = data?.funnel ?? [];

  const retD7 = kpis ? retentionPct(kpis.retained_ever_d7, kpis.eligible_d7) : 0;
  const retD30 = kpis ? retentionPct(kpis.retained_ever_d30, kpis.eligible_d30) : 0;

  const neverActivatedPct = kpis ? retentionPct(kpis.never_activated, kpis.total_members) : 0;

  const isNoActivation = kpis?.active_rolling_7d === 0 && (kpis?.total_members ?? 0) > 0;

  if (isError) {
    return (
      <div className="rounded-card border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-sm font-medium text-red-400">Erreur de chargement</p>
        <p className="text-xs text-slate-500 mt-1">{error?.message ?? "Erreur inconnue"}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-card bg-surface-raised p-4 space-y-2">
              <Sk className="h-3 w-20" />
              <Sk className="h-7 w-16" />
              <Sk className="h-2.5 w-14" />
            </div>
          ))}
        </div>
        <Sk className="h-40 w-full" />
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="rounded-card border border-surface-raised bg-surface p-6 text-center text-sm text-slate-500">
        Aucune donnée disponible.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-slate-100">Analytics rétention</h1>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          <span className="text-xs text-slate-500">Supabase live</span>
        </div>
      </div>

      {isNoActivation && (
        <div className="rounded-card border border-red-500/30 bg-red-500/8 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-400">Aucune activation terrain détectée</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {kpis.total_members} membres inscrits, {kpis.active_rolling_7d} actif(s) cette semaine.{" "}
              {neverActivatedPct}% des membres n&apos;ont jamais ouvert de créneau. Lancer une campagne
              SMS ciblée et vérifier l&apos;onboarding mobile.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Membres inscrits"
          value={kpis.total_members}
          sub={`${kpis.eligible_d7} éligibles J7`}
        />
        <KpiCard
          label="Rétention J7"
          value={`${retD7}%`}
          sub={`${kpis.retained_ever_d7} / ${kpis.eligible_d7}`}
          color={retD7 >= 30 ? "success" : retD7 >= 15 ? "warning" : "danger"}
        />
        <KpiCard
          label="Rétention J30"
          value={`${retD30}%`}
          sub={`${kpis.retained_ever_d30} / ${kpis.eligible_d30}`}
          color={retD30 >= 20 ? "success" : retD30 >= 10 ? "warning" : "danger"}
        />
        <KpiCard
          label="Actifs rolling 7j"
          value={kpis.active_rolling_7d}
          sub={`${kpis.active_rolling_30d} sur 30j`}
          color={kpis.active_rolling_7d > 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DauSparkline data={dau} />
        <FunnelChart data={funnel} />
      </div>

      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
          Rétention par cohorte hebdomadaire
        </h2>
        <CohortTable cohorts={cohorts} />
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
          Benchmarks SaaS B2B terrain
        </h2>
        <div className="rounded-card border border-surface-raised bg-surface p-4">
          <BenchmarkBar
            label="E-Samba J7"
            value={retD7}
            max={70}
            color={retD7 >= 30 ? "#10b981" : "#ef4444"}
          />
          <BenchmarkBar label="Cible J7" value={40} max={70} color="#10b981" />
          <BenchmarkBar
            label="E-Samba J30"
            value={retD30}
            max={70}
            color={retD30 >= 20 ? "#10b981" : "#ef4444"}
          />
          <BenchmarkBar label="Cible J30" value={25} max={70} color="#10b981" />
          <BenchmarkBar label="Autodoc app" value={65} max={70} color="#3b82f6" />
        </div>
        <p className="text-xs text-slate-600 mt-2">
          Source : benchmarks SaaS B2B mobile 2025. « Actif » = a ouvert ou clôturé au moins un créneau
          dans la fenêtre.
        </p>
      </section>
    </div>
  );
}
