import {
  Car,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Fuel,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreneauActifValidation } from "@/hooks/useFleetValidation";
import { cn } from "@/lib/utils";

export interface FicheCreneauActifProps {
  creneauId: string;
}

interface ArticleValidationProps {
  icone: React.ReactNode;
  label: string;
  valide: boolean;
  detail: string;
}

function ArticleValidation({ icone, label, valide, detail }: ArticleValidationProps) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icone}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{detail}</span>
        {valide ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" aria-hidden />
        )}
      </div>
    </div>
  );
}

/** Fiche détaillée du créneau actif — source : v_creneaux_actifs_validations. */
export function FicheCreneauActif({ creneauId }: FicheCreneauActifProps) {
  const { data: donnees, isPending, isError } = useCreneauActifValidation(creneauId);

  if (isPending) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 animate-spin" aria-hidden />
          Chargement des données du créneau…
        </CardContent>
      </Card>
    );
  }

  if (isError || !donnees) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-destructive">
          Impossible de charger les données du créneau.
        </CardContent>
      </Card>
    );
  }

  const heureDebut = new Date(donnees.started_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const dureeMs = Date.now() - new Date(donnees.started_at).getTime();
  const dureeHeures = Math.floor(dureeMs / 3_600_000);
  const dureeMinutes = Math.floor((dureeMs % 3_600_000) / 60_000);

  const etapesOk = [
    donnees.dvir_pre_count > 0,
    donnees.carburant_saisies > 0,
    donnees.dvir_post_count > 0,
  ].filter(Boolean).length;

  const pct = Math.round((etapesOk / 3) * 100);
  const couleurBarre =
    pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <Card className="mt-3">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Car className="h-4 w-4 text-primary" aria-hidden />
          Détails du créneau en cours
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">
              {[donnees.brand, donnees.model].filter(Boolean).join(" ")}
            </p>
            <p className="text-xs text-muted-foreground">
              Départ : {heureDebut} · {dureeHeures}h{dureeMinutes}min en cours
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {donnees.registration}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-muted-foreground">KM départ</p>
            <p className="font-semibold">
              {donnees.km_start > 0
                ? donnees.km_start.toLocaleString("fr-FR")
                : "Non renseigné"}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-muted-foreground">KM actuel</p>
            <p className="font-semibold">
              {donnees.current_km > 0 ? donnees.current_km.toLocaleString("fr-FR") : "—"}
            </p>
          </div>
        </div>

        <div className="mt-2">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Validations enregistrées
          </p>

          <ArticleValidation
            icone={<ClipboardCheck className="h-4 w-4 text-primary" aria-hidden />}
            label="DVIR pré-trip"
            valide={donnees.dvir_pre_count > 0}
            detail={
              donnees.dvir_pre_count > 0
                ? `Statut : ${donnees.dvir_pre_statut ?? "ok"}`
                : "Non effectué"
            }
          />

          <ArticleValidation
            icone={<Fuel className="h-4 w-4 text-amber-500" aria-hidden />}
            label="Saisie carburant"
            valide={donnees.carburant_saisies > 0}
            detail={
              donnees.carburant_saisies > 0
                ? `${Number(donnees.carburant_litres_total).toFixed(1)} L · ${donnees.carburant_xof_total.toLocaleString("fr-FR")} XAF`
                : "Aucune saisie"
            }
          />

          <ArticleValidation
            icone={<ClipboardCheck className="h-4 w-4 text-violet-500" aria-hidden />}
            label="DVIR post-trip"
            valide={donnees.dvir_post_count > 0}
            detail={
              donnees.dvir_post_count > 0
                ? `Statut : ${donnees.dvir_post_statut ?? "ok"}`
                : "En attente de clôture"
            }
          />

          {donnees.cloture_statut ? (
            <ArticleValidation
              icone={<CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />}
              label="Clôture / Recettes"
              valide={donnees.cloture_statut === "validated"}
              detail={
                donnees.cloture_revenue_declared != null
                  ? `${donnees.cloture_revenue_declared.toLocaleString("fr-FR")} XAF déclarés`
                  : `Statut : ${donnees.cloture_statut}`
              }
            />
          ) : null}
        </div>

        <div className="mt-2">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Complétude de la plage</span>
            <span>{etapesOk}/3 étapes</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full transition-all duration-500", couleurBarre)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
