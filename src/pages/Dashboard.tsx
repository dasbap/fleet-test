import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkOnline } from "@/features/account/hooks/useNetworkOnline";
import {
  AlertTriangle,
  CarFront,
  ClipboardList,
  Gauge,
  PartyPopper,
  RefreshCw,
  WifiOff,
  Wrench,
  X,
} from "lucide-react";
import { useCurrentRole } from "@/hooks/useCurrentRole";
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
import { KpisFlotte } from "@/components/dashboard/KpisFlotte";
import { TableauValidations } from "@/components/dashboard/TableauValidations";
import { useActionableDashboard } from "@/hooks/useActionableDashboard";
import { useActivation } from "@/hooks/useActivation";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { useDriverScores } from "@/hooks/useDriverScores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { KpiSummary } from "@/types/dashboard";

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
    <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-foreground">
      <WifiOff className="h-4 w-4 flex-shrink-0 text-warning" aria-hidden />
      <span>Mode hors ligne — données issues du cache local.</span>
    </div>
  );
}

function PendingClosuresAlertBanner({ fleetId }: { fleetId?: string | null }) {
  const { isManager, isOrganizer } = useCurrentRole();
  if (!isManager && !isOrganizer) {
    return null;
  }
  return <ClosureBanner fleetId={fleetId} />;
}

function KpiDegradedBanner({
  onRetry,
  isRetrying,
}: {
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-foreground"
    >
      <span>
        Les indicateurs temps réel sont temporairement indisponibles. Rechargez la page ou réessayez dans
        quelques instants.
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-border bg-card hover:bg-muted"
        onClick={onRetry}
        disabled={isRetrying}
      >
        <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRetrying && "animate-spin")} />
        Réessayer
      </Button>
    </div>
  );
}

function pluralizeFr(count: number, singular: string, plural: string = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`;
}

function DashboardCommandCenter({
  userName,
  isOnline,
  kpis,
  totalVehicles,
}: {
  userName?: string;
  isOnline: boolean;
  kpis: KpiSummary;
  totalVehicles: number;
}) {
  const firstName = userName?.trim().split(/\s+/)[0];
  const alertLabel = pluralizeFr(kpis.criticalAlerts, "alerte critique");
  const maintenanceLabel = pluralizeFr(kpis.overdueServices, "entretien en retard", "entretiens en retard");

  const healthTone =
    kpis.criticalAlerts > 0
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
      : kpis.overdueServices > 0
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";

  return (
    <section className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                {firstName ? `Bonjour ${firstName}` : "Bonjour"}
              </p>
              <h1 className="mt-1 text-2xl font-heading font-semibold text-foreground">
                Centre de controle flotte
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Priorites du jour, incidents et capacite operationnelle reunis au meme endroit.
              </p>
            </div>
            <div
              className={cn(
                "inline-flex w-fit items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium",
                isOnline
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-amber-500")} />
              {isOnline ? "Synchronise" : "Cache local"}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <CommandMetric
              icon={<CarFront className="h-4 w-4" />}
              label="Vehicules actifs"
              value={`${kpis.activeVehicles}/${Math.max(totalVehicles, kpis.activeVehicles)}`}
            />
            <CommandMetric
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Alertes critiques"
              value={String(kpis.criticalAlerts)}
              tone={kpis.criticalAlerts > 0 ? "critical" : "normal"}
            />
            <CommandMetric
              icon={<Wrench className="h-4 w-4" />}
              label="Entretiens en retard"
              value={String(kpis.overdueServices)}
              tone={kpis.overdueServices > 0 ? "warning" : "normal"}
            />
          </div>
        </div>

        <div className="border-t bg-muted/20 p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className={cn("mb-4 rounded-md border px-3 py-2 text-sm", healthTone)}>
            <div className="flex items-center gap-2 font-medium">
              <Gauge className="h-4 w-4" />
              {kpis.criticalAlerts > 0 || kpis.overdueServices > 0
                ? "Intervention requise"
                : "Operation stable"}
            </div>
            <p className="mt-1 text-xs opacity-90">
              {alertLabel} · {maintenanceLabel}
            </p>
          </div>

          <div className="grid gap-2">
            <Button asChild className="justify-start">
              <Link to={ROUTE_PATHS.dashboardIncidentDeclare}>
                <AlertTriangle className="h-4 w-4" />
                Declarer un incident
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to={ROUTE_PATHS.dashboardVehicles}>
                <CarFront className="h-4 w-4" />
                Ajouter un vehicule
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to={ROUTE_PATHS.dashboardMaintenance}>
                <ClipboardList className="h-4 w-4" />
                Planifier entretien
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommandMetric({
  icon,
  label,
  value,
  tone = "normal",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "normal" | "warning" | "critical";
}) {
  const toneClass = {
    normal: "border-border bg-background text-foreground",
    warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
    critical: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
  }[tone];

  return (
    <div className={cn("rounded-md border p-3", toneClass)}>
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, userFleetId: currentFleetId } = useAuth();
  const { isManager, isOrganizer } = useCurrentRole();
  const canValidateClosures = isManager || isOrganizer;
  const isOnline = useNetworkOnline();
  const { steps, completedCount, loading } = useActivation();
  const {
    kpis,
    kpisDegraded,
    refetchKpis,
    alerts,
    resolveAlert,
    scheduledJobs,
    avgKm,
    todayRevenueXaf,
    totalVehicles,
    fuelSpendXof,
    fuelLiters,
    coreLoading,
  } = useActionableDashboard();
  const [isKpiRetrying, setIsKpiRetrying] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const { missingCount } = useMissingPhoneCount(currentFleetId);
  const { data: topDriverScores = [] } = useDriverScores(currentFleetId ?? undefined, {
    enabled: !!currentFleetId,
    limit: 5,
  });
  const isAllDone = completedCount >= steps.length;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? undefined;

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
        <PendingClosuresAlertBanner fleetId={currentFleetId} />
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
      <PendingClosuresAlertBanner fleetId={currentFleetId} />
      <ExpiringDocumentsBanner fleetId={currentFleetId} />
      {showWelcome && (
        <WelcomeBanner
          userName={(user?.user_metadata?.full_name as string | undefined) ?? user?.email}
          onDismiss={() => setShowWelcome(false)}
        />
      )}
      <div className={cn("flex gap-6", !isAllDone ? "flex-col lg:flex-row" : "flex-col")}>
        <div className="flex-1 min-w-0 space-y-6">
          <DashboardCommandCenter
            userName={displayName}
            isOnline={isOnline}
            kpis={kpis}
            totalVehicles={totalVehicles}
          />

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

          {coreLoading ? (
            <ActionableDashboardSkeleton />
          ) : (
            <>
              {kpisDegraded ? (
                <KpiDegradedBanner
                  isRetrying={isKpiRetrying}
                  onRetry={() => {
                    setIsKpiRetrying(true);
                    void refetchKpis().finally(() => setIsKpiRetrying(false));
                  }}
                />
              ) : null}
              {canValidateClosures && currentFleetId ? (
                <section className="space-y-4" aria-labelledby="flotte-validations-titre">
                  <h2 id="flotte-validations-titre" className="text-sm font-medium text-muted-foreground">
                    Validations flotte
                  </h2>
                  <KpisFlotte fleetId={currentFleetId} />
                  <TableauValidations fleetId={currentFleetId} />
                </section>
              ) : null}
              <ActionableDashboard
                kpis={kpis}
                alerts={alerts}
                scheduledJobs={scheduledJobs}
                avgKm={avgKm}
                todayRevenueXaf={todayRevenueXaf}
                totalVehicles={totalVehicles}
                fuelSpendXof={fuelSpendXof}
                fuelLiters={fuelLiters}
                onNavigateVehicle={(vehicleId) =>
                  navigate(ROUTE_PATHS.dashboardVehicleDetail(vehicleId))
                }
                onNavigateAlerts={() => navigate(ROUTE_PATHS.dashboardAlerts)}
                onNavigateMaintenance={() => navigate(ROUTE_PATHS.dashboardMaintenance)}
                onResolveAlert={resolveAlert}
              />
            </>
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
