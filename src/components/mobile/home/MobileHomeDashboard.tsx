import {
  AlertOctagon,
  Car,
  Gauge,
  MapPin,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMobileHomeKpis } from "@/hooks/useMobileHomeKpis";
import { getMobileHomeCopy } from "@/lib/mobileHomeCopy";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MobileKpiCard } from "./MobileKpiCard";
import { MobileQuickActions } from "./MobileQuickActions";
import { getQuickActionsForRole } from "./mobileQuickActionsByRole";

const roleLabel: Record<string, string> = {
  organizer: "Organisateur",
  manager: "Gestionnaire",
  mechanic: "Mécanicien",
  driver: "Conducteur",
};

function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[110px] rounded-xl" />
      ))}
      <Skeleton className="col-span-2 h-[110px] rounded-xl" />
    </div>
  );
}

/**
 * Accueil mobile : synthèse KPI (hooks métier) + actions rapides.
 */
export function MobileHomeDashboard() {
  const { role } = useAuth();
  const { kpis, isLoading, isError } = useMobileHomeKpis();
  const copy = getMobileHomeCopy(role);
  const quickActions = getQuickActionsForRole(role);
  const r = role ?? "organizer";
  const greeting = roleLabel[r] ?? "Équipe";
  const L = copy.labels;

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 pb-safe">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/90">
          Flotte E-Samba
        </p>
        <h1 className="font-heading text-[1.65rem] font-bold leading-[1.2] tracking-tight">
          Bonjour, {greeting}
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{copy.subtitle}</p>
      </header>

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>Données indisponibles</AlertTitle>
          <AlertDescription>
            Impossible de charger les indicateurs. Vérifiez votre connexion puis réessayez.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Indicateurs clés
        </h2>
        {isLoading ? (
          <KpiGridSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
              <MobileKpiCard
                icon={Car}
                label={L?.active ?? "Véhicules actifs"}
                value={kpis.activeVehicles}
                variant="success"
              />
              <MobileKpiCard
                icon={AlertOctagon}
                label={L?.immobilized ?? "Immobilisés"}
                value={kpis.immobilizedVehicles}
                variant={kpis.immobilizedVehicles > 0 ? "warning" : "default"}
              />
              <MobileKpiCard
                icon={Wrench}
                label={L?.maintenance ?? "Entretiens cette semaine"}
                value={kpis.maintenanceDueThisWeek}
                variant={kpis.maintenanceDueThisWeek > 5 ? "warning" : "default"}
              />
              <MobileKpiCard
                icon={Gauge}
                label={L?.alerts ?? "Alertes critiques non traitées"}
                value={kpis.criticalAlertsOpen}
                variant={kpis.criticalAlertsOpen > 0 ? "destructive" : "success"}
              />
            </div>
            <div className="mt-3.5">
              <MobileKpiCard
                icon={MapPin}
                label={copy.missionsLabel}
                value={kpis.missionsInProgress}
                variant="default"
                className="col-span-2"
              />
            </div>
          </>
        )}
      </section>

      <MobileQuickActions actions={quickActions} />
    </div>
  );
}
