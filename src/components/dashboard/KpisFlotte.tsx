import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useKpisFlotte } from "@/hooks/useFleetValidation";
import { cn } from "@/lib/utils";

interface KpisFlotteProps {
  fleetId: string;
}

interface CarteKpiProps {
  label: string;
  valeur: string | number;
  icone: React.ReactNode;
  couleur: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive" | "warning";
}

function CarteKpi({ label, valeur, icone, couleur, badge, badgeVariant = "secondary" }: CarteKpiProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className={cn("rounded-md p-2", couleur)}>{icone}</div>
          {badge ? (
            <Badge variant={badgeVariant} className="text-xs">
              {badge}
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-2xl font-bold tabular-nums">{valeur}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function KpisFlotteSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

/** KPIs temps réel de la flotte — source : vue v_kpis_flotte. */
export function KpisFlotte({ fleetId }: KpisFlotteProps) {
  const { data: kpis, isPending, dataUpdatedAt, refetch, isFetching } = useKpisFlotte(fleetId);

  const formatXaf = (montant: number) =>
    new Intl.NumberFormat("fr-FR").format(montant) + " XAF";

  const heureMAJ = new Date(dataUpdatedAt || Date.now()).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isPending && !kpis) {
    return <KpisFlotteSkeleton />;
  }

  if (!kpis) {
    return null;
  }

  const ecartPositif = kpis.ecart_total_xaf >= 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <CarteKpi
          label="Véhicules actifs"
          valeur={kpis.vehicules_actifs}
          icone={<Car className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden />}
          couleur="bg-blue-500/10"
          badge={`${kpis.creneaux_ouverts} créneau${kpis.creneaux_ouverts > 1 ? "x" : ""}`}
        />
        <CarteKpi
          label="Revenus validés"
          valeur={formatXaf(kpis.revenus_valides_xaf)}
          icone={<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />}
          couleur="bg-emerald-500/10"
        />
        <CarteKpi
          label="En attente validation"
          valeur={formatXaf(kpis.revenus_en_attente_xaf)}
          icone={<Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />}
          couleur="bg-amber-500/10"
          badge={
            kpis.clotures_pending > 0
              ? `${kpis.clotures_pending} clôture${kpis.clotures_pending > 1 ? "s" : ""}`
              : undefined
          }
          badgeVariant="warning"
        />
        <CarteKpi
          label="Écart recettes"
          valeur={formatXaf(Math.abs(kpis.ecart_total_xaf))}
          icone={
            <TrendingUp
              className={cn(
                "h-4 w-4",
                ecartPositif ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
              )}
              aria-hidden
            />
          }
          couleur={ecartPositif ? "bg-emerald-500/10" : "bg-red-500/10"}
          badge={ecartPositif ? "+" : "−"}
          badgeVariant={ecartPositif ? "secondary" : "destructive"}
        />
      </div>

      {(kpis.clotures_rejetees > 0 || kpis.clotures_sans_preuve > 0) && (
        <div className="flex flex-wrap items-center gap-3">
          {kpis.clotures_rejetees > 0 ? (
            <div className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
              <XCircle className="h-3.5 w-3.5" aria-hidden />
              <span>
                {kpis.clotures_rejetees} clôture{kpis.clotures_rejetees > 1 ? "s" : ""} rejetée
                {kpis.clotures_rejetees > 1 ? "s" : ""}
              </span>
            </div>
          ) : null}
          {kpis.clotures_sans_preuve > 0 ? (
            <div className="flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              <span>
                {kpis.clotures_sans_preuve} clôture{kpis.clotures_sans_preuve > 1 ? "s" : ""} sans
                preuve photo
              </span>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Mis à jour à {heureMAJ} · rafraîchissement auto 2 min</span>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="flex items-center gap-1 transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} aria-hidden />
          <span>Actualiser</span>
        </button>
      </div>
    </div>
  );
}
