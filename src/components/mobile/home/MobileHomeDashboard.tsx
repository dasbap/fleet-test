import {
  AlertOctagon,
  Car,
  Gauge,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMobileHomeKpis } from "@/hooks/useMobileHomeKpis";
import { getMobileHomeCopy } from "@/lib/mobileHomeCopy";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MobileKpiCard } from "./MobileKpiCard";
import { MobileQuickActions } from "./MobileQuickActions";
import { getQuickActionsForRole } from "./mobileQuickActionsByRole";
import { RoleBadge, getRoleLabel } from "@/components/auth/RoleBadge";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import {
  mobileHomeBrandOverline,
  mobileHomeHeroSubtitle,
  mobileHomeHeroTitle,
  mobileScreenStackRelaxed,
} from "@/lib/mobile/mobileUiTokens";

function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[110px] rounded-xl" />
      ))}
    </div>
  );
}

/**
 * Accueil mobile : synthèse KPI (hooks métier) + actions rapides.
 */
export function MobileHomeDashboard() {
  const { role } = useAuth();
  const { rbac } = useRoleAccess();
  const { kpis, isLoading, isError } = useMobileHomeKpis();
  const copy = getMobileHomeCopy(role);
  const quickActions = getQuickActionsForRole(role);
  const greeting = getRoleLabel(rbac.platformRole);
  const L = copy.labels;

  return (
    <div className={cn("mx-auto w-full max-w-lg pb-safe", mobileScreenStackRelaxed)}>
      <header className="space-y-2">
        <p className={mobileHomeBrandOverline}>Flotte E-Samba</p>
        <div className="flex items-center justify-between">
          <h1 className={mobileHomeHeroTitle}>Bonjour !</h1>
          <RoleBadge role={rbac.platformRole} size="sm" showIcon />
        </div>
        <p className={mobileHomeHeroSubtitle}>{copy.subtitle}</p>
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
                icon={Gauge}
                label={L?.alerts ?? "Alertes critiques"}
                value={kpis.criticalAlertsOpen}
                variant={kpis.criticalAlertsOpen > 0 ? "destructive" : "success"}
              />
              <MobileKpiCard
                icon={MapPin}
                label={copy.missionsLabel}
                value={kpis.missionsInProgress}
                variant="default"
              />
            </div>
          </>
        )}
      </section>

      <MobileQuickActions actions={quickActions} />
    </div>
  );
}
