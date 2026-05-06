import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkOnline } from "@/features/account/hooks/useNetworkOnline";
import { WifiOff } from "lucide-react";
import { EmptyStateDashboard } from "@/components/dashboard/EmptyStateDashboard";
import { ActivationChecklist } from "@/components/shared/ActivationChecklist";
import {
  PhoneAlertBanner,
  PhoneCollectionModal,
} from "@/components/shared/PhoneCollectionModal";
import { useMissingPhoneCount } from "@/hooks/useMissingPhoneCount";
import { DriverActivationHealthCard } from "@/components/dashboard/DriverActivationHealthCard";
import {
  ClosureBanner,
  ExpiringDocumentsBanner,
} from "@/components/alerts/ClosureBanner";
import {
  ActionableDashboard,
  ActionableDashboardSkeleton,
} from "@/components/dashboard/ActionableDashboard";
import { useActionableDashboard } from "@/hooks/useActionableDashboard";
import { useActivation } from "@/hooks/useActivation";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { X, PartyPopper } from "lucide-react";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { useDriverScores } from "@/hooks/useDriverScores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

function OfflineBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>Mode hors ligne — données issues du cache local.</span>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, userFleetId: currentFleetId } = useAuth();
  const isOnline = useNetworkOnline();
  const { steps, completedCount, loading } = useActivation();
  const {
    kpis,
    alerts,
    resolveAlert,
    scheduledJobs,
    avgKm,
    todayRevenueXaf,
    totalVehicles,
    coreLoading,
  } = useActionableDashboard();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const { missingCount } = useMissingPhoneCount(currentFleetId);
  const { data: topDriverScores = [] } = useDriverScores(currentFleetId, {
    enabled: !!currentFleetId,
    limit: 5,
  });
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
        {!isOnline && <OfflineBanner />}
        <ClosureBanner fleetId={currentFleetId} />
        <ExpiringDocumentsBanner fleetId={currentFleetId} />
        {showWelcome && (
          <WelcomeBanner
            userName={(user?.user_metadata?.full_name as string | undefined) ?? user?.email}
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
      {!isOnline && <OfflineBanner />}
      <ClosureBanner fleetId={currentFleetId} />
      <ExpiringDocumentsBanner fleetId={currentFleetId} />
      {showWelcome && (
        <WelcomeBanner
          userName={(user?.user_metadata?.full_name as string | undefined) ?? user?.email}
          onDismiss={() => setShowWelcome(false)}
        />
      )}
      <div className={cn("flex gap-6", !isAllDone ? "flex-col lg:flex-row" : "flex-col")}>
        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <h1 className="text-xl font-heading font-semibold text-slate-800 dark:text-slate-100">Tableau de bord</h1>
            <p className="text-sm text-slate-400 mt-0.5">Vue d'ensemble de votre flotte</p>
          </div>

          <ClosureBanner />
          <PhoneAlertBanner count={missingCount} onAction={() => setShowPhoneModal(true)} />
          <PhoneCollectionModal
            fleetId={currentFleetId}
            open={showPhoneModal}
            onClose={() => setShowPhoneModal(false)}
            onComplete={(count) =>
              toast({
                title: "Numéros enregistrés",
                description: `${count} numéro${count > 1 ? "s" : ""} enregistré${count > 1 ? "s" : ""} — séquences débloquées`,
              })
            }
          />

          {coreLoading || !kpis ? (
            <ActionableDashboardSkeleton />
          ) : (
            <ActionableDashboard
              kpis={kpis}
              alerts={alerts}
              scheduledJobs={scheduledJobs}
              avgKm={avgKm}
              todayRevenueXaf={todayRevenueXaf}
              totalVehicles={totalVehicles}
              onNavigateVehicle={(vehicleId) =>
                navigate(ROUTE_PATHS.dashboardVehicleDetail(vehicleId))
              }
              onNavigateAlerts={() => navigate(ROUTE_PATHS.dashboardAlerts)}
              onNavigateMaintenance={() => navigate(ROUTE_PATHS.dashboardMaintenance)}
              onResolveAlert={resolveAlert}
            />
          )}
          <DriverActivationHealthCard />
          <DriverScoresQuickWidget
            scores={topDriverScores}
            onOpenScores={() => navigate(ROUTE_PATHS.dashboardDriverScores)}
          />
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

function DriverScoresQuickWidget({
  scores,
  onOpenScores,
}: {
  scores: Array<{ id: string; driver?: { full_name: string | null }; score_total: number | null }>;
  onOpenScores: () => void;
}) {
  const sortedScores = [...scores].sort((a, b) => (b.score_total ?? 0) - (a.score_total ?? 0));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Scores conducteurs</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={onOpenScores}>
            Voir tout
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedScores.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun score disponible pour le moment.
          </p>
        ) : (
          sortedScores.map((score, index) => (
            <div key={score.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {index + 1}. {score.driver?.full_name ?? "Conducteur inconnu"}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {score.score_total != null ? Math.round(score.score_total) : "—"}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
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
