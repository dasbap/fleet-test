import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { EmptyStateDashboard } from "@/components/dashboard/EmptyStateDashboard";
import { ActivationChecklist } from "@/components/shared/ActivationChecklist";
import { DriverActivationHealthCard } from "@/components/dashboard/DriverActivationHealthCard";
import { useActivation } from "@/hooks/useActivation";
import { cn } from "@/lib/utils";
import { X, PartyPopper } from "lucide-react";

// ─── Welcome Banner ─────────────────────────────────────────────────────────

function WelcomeBanner({ userName, onDismiss }: { userName?: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm">
      <PartyPopper className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-emerald-800 dark:text-emerald-200">
          Bienvenue{userName ? `, ${userName}` : ""} sur E-Samba !
        </p>
        <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
          Votre espace est prêt. Ouvrez votre premier créneau pour activer votre flotte.
        </p>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Fermer"
        className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const { steps, completedCount, loading } = useActivation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);
  const isAllDone = completedCount >= steps.length;

  // Detect ?welcome=true, show banner, then clean URL
  useEffect(() => {
    if (searchParams.get("welcome") === "true") {
      setShowWelcome(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("welcome");
        return next;
      }, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss after 8s
  useEffect(() => {
    if (!showWelcome) return;
    const id = setTimeout(() => setShowWelcome(false), 8_000);
    return () => clearTimeout(id);
  }, [showWelcome]);

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
        {showWelcome && (
          <WelcomeBanner
            userName={user?.user_metadata?.full_name ?? user?.email}
            onDismiss={() => setShowWelcome(false)}
          />
        )}
        <h1 className="text-xl font-heading font-semibold text-slate-800 dark:text-slate-100">Tableau de bord</h1>
        <EmptyStateDashboard daysSinceSignup={daysSinceSignup} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showWelcome && (
        <WelcomeBanner
          userName={user?.user_metadata?.full_name ?? user?.email}
          onDismiss={() => setShowWelcome(false)}
        />
      )}
      <div className={cn("flex gap-6", !isAllDone ? "flex-col lg:flex-row" : "flex-col")}>
        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <h1 className="text-xl font-heading font-semibold text-slate-800 dark:text-slate-100">Tableau de bord</h1>
            <p className="text-sm text-slate-400 mt-0.5">Vue d'ensemble de votre flotte</p>
          </div>

          <PlaceholderStats />
          <DriverActivationHealthCard />
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
      {["Véhicules actifs", "Alertes ouvertes", "Km parcourus", "Coût/km"].map((label) => (
        <div key={label} className="bg-white dark:bg-surface border border-slate-100 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">{label}</p>
          <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">—</p>
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
      <p className="text-sm text-slate-400">Activité récente</p>
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
