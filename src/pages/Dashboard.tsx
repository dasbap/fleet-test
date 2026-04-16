import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { EmptyStateDashboard } from "@/components/dashboard/EmptyStateDashboard";
import { ActivationChecklist } from "@/components/shared/ActivationChecklist";
import { useActivation } from "@/hooks/useActivation";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const { steps, completedCount, loading } = useActivation();
  const isAllDone = completedCount >= steps.length;

  const daysSinceSignup = useMemo(() => {
    if (!user?.created_at) return 0;
    const createdAt = new Date(user.created_at).getTime();
    if (Number.isNaN(createdAt)) return 0;
    const diffDays = Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000));
    return diffDays > 0 ? diffDays : 0;
  }, [user?.created_at]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (completedCount === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-heading font-semibold text-slate-800 dark:text-slate-100">Tableau de bord</h1>
        <EmptyStateDashboard daysSinceSignup={daysSinceSignup} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={cn("flex gap-6", !isAllDone ? "flex-col lg:flex-row" : "flex-col")}>
        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <h1 className="text-xl font-heading font-semibold text-slate-800 dark:text-slate-100">Tableau de bord</h1>
            <p className="text-sm text-slate-400 mt-0.5">Vue d'ensemble de votre flotte</p>
          </div>

          <PlaceholderStats />
          <PlaceholderActions />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PlaceholderMap />
            <PlaceholderFeed />
          </div>
        </div>

        {!isAllDone ? (
          <div className="lg:w-72 xl:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-6">
              <ActivationChecklist mode="card" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PlaceholderStats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {["V?hicules actifs", "Alertes ouvertes", "Km parcourus", "Co?t/km"].map((label) => (
        <div key={label} className="bg-white dark:bg-surface border border-slate-100 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">{label}</p>
          <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">?</p>
        </div>
      ))}
    </div>
  );
}

function PlaceholderActions() {
  return (
    <div className="bg-white dark:bg-surface border border-slate-100 dark:border-slate-800 rounded-xl p-4 h-32 flex items-center justify-center">
      <p className="text-sm text-slate-400">Alertes actionnables</p>
    </div>
  );
}

function PlaceholderMap() {
  return (
    <div className="bg-white dark:bg-surface border border-slate-100 dark:border-slate-800 rounded-xl p-4 h-48 flex items-center justify-center">
      <p className="text-sm text-slate-400">Carte de la flotte</p>
    </div>
  );
}

function PlaceholderFeed() {
  return (
    <div className="bg-white dark:bg-surface border border-slate-100 dark:border-slate-800 rounded-xl p-4 h-48 flex items-center justify-center">
      <p className="text-sm text-slate-400">Activit? r?cente</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-6 w-40 bg-slate-100 dark:bg-slate-800 rounded mb-1" />
      <div className="h-4 w-56 bg-slate-50 dark:bg-slate-900 rounded mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        ))}
      </div>
      <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      </div>
    </div>
  );
}
