import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { ApercuPreuveCloture } from "@/components/dashboard/ApercuPreuveCloture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreneauxValidations } from "@/hooks/useFleetValidation";
import { useReviewClosure } from "@/hooks/useDriverShifts";
import { toast } from "@/hooks/use-toast";
import type { CreneauValidationLigne, StatutValidation } from "@/types/fleet-validation";
import { cn } from "@/lib/utils";

export interface TableauValidationsProps {
  fleetId: string;
}

function BadgeStatut({ statut }: { statut: StatutValidation }) {
  const configs: Record<
    StatutValidation,
    { cls: string; label: string }
  > = {
    complet: { cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", label: "Complet" },
    en_attente: { cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300", label: "En attente" },
    incomplet: { cls: "bg-orange-500/15 text-orange-700 dark:text-orange-300", label: "Incomplet" },
    alerte: { cls: "bg-red-500/15 text-red-700 dark:text-red-300", label: "Alerte" },
  };
  const c = configs[statut];
  return (
    <Badge variant="outline" className={cn("text-xs", c.cls)}>
      {c.label}
    </Badge>
  );
}

function CelluleCheck({ ok, alerte = false }: { ok: boolean; alerte?: boolean }) {
  if (ok) return <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" aria-hidden />;
  if (alerte) return <AlertTriangle className="mx-auto h-4 w-4 text-red-500" aria-hidden />;
  return <Clock className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden />;
}

function TableauValidationsSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

/** Tableau de validation des créneaux ouverts — source : v_creneaux_actifs_validations. */
export function TableauValidations({ fleetId }: TableauValidationsProps) {
  const { data: lignes = [], isPending, refetch, isFetching } = useCreneauxValidations(fleetId);
  const reviewMutation = useReviewClosure();
  const [validationEnCours, setValidationEnCours] = useState<string | null>(null);

  const validerCloture = async (creneauId: string, clotureId: string) => {
    setValidationEnCours(creneauId);
    try {
      await reviewMutation.mutateAsync({ closureId: clotureId, status: "validated" });
      await refetch();
    } finally {
      setValidationEnCours(null);
    }
  };

  const rejeterCloture = async (clotureId: string) => {
    await reviewMutation.mutateAsync({ closureId: clotureId, status: "rejected" });
    await refetch();
  };

  const toutValider = async () => {
    const aValider = lignes.filter((l) => l.cloture_id && l.cloture_statut === "pending");
    if (!aValider.length) {
      toast({
        title: "Rien à valider",
        description: "Toutes les clôtures sont déjà traitées.",
      });
      return;
    }
    for (const ligne of aValider) {
      if (ligne.cloture_id) {
        await validerCloture(ligne.creneau_id, ligne.cloture_id);
      }
    }
  };

  const nbEnAttente = lignes.filter((l) => l.cloture_statut === "pending").length;
  const nbAlertes = lignes.filter((l) => l.statut_global === "alerte").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">Validations — Créneaux ouverts</h3>
          {nbAlertes > 0 ? (
            <Badge variant="destructive" className="text-xs">
              {nbAlertes} alerte{nbAlertes > 1 ? "s" : ""}
            </Badge>
          ) : null}
          {nbEnAttente > 0 ? (
            <Badge variant="warning" className="text-xs">
              {nbEnAttente} à valider
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="h-7 px-2"
            aria-label="Actualiser"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          </Button>
          {nbEnAttente > 0 ? (
            <Button size="sm" onClick={() => void toutValider()} className="h-7 text-xs">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden />
              Tout valider ({nbEnAttente})
            </Button>
          ) : null}
        </div>
      </div>

      {isPending ? (
        <TableauValidationsSkeleton />
      ) : lignes.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500 opacity-60" aria-hidden />
          <p>Aucun créneau ouvert à valider.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  "Véhicule",
                  "Départ",
                  "DVIR pré",
                  "Carburant",
                  "DVIR post",
                  "Preuve",
                  "Clôture",
                  "Statut",
                  "Actions",
                ].map((h) => (
                  <TableHead key={h} className="text-xs font-medium text-muted-foreground">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map((ligne) => (
                <LigneValidationRow
                  key={ligne.creneau_id}
                  ligne={ligne}
                  validationEnCours={validationEnCours}
                  onValider={validerCloture}
                  onRejeter={rejeterCloture}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

interface LigneValidationRowProps {
  ligne: CreneauValidationLigne;
  validationEnCours: string | null;
  onValider: (creneauId: string, clotureId: string) => void;
  onRejeter: (clotureId: string) => void;
}

function LigneValidationRow({
  ligne,
  validationEnCours,
  onValider,
  onRejeter,
}: LigneValidationRowProps) {
  const heure = new Date(ligne.started_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = new Date(ligne.started_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <TableRow>
      <TableCell>
        <p className="text-sm font-medium">{ligne.registration}</p>
        <p className="text-xs text-muted-foreground">
          {[ligne.brand, ligne.model].filter(Boolean).join(" ")}
        </p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{date}</p>
        <p>{heure}</p>
      </TableCell>
      <TableCell className="text-center">
        <CelluleCheck ok={ligne.dvir_pre_count > 0} alerte />
      </TableCell>
      <TableCell className="text-center">
        {ligne.carburant_saisies > 0 ? (
          <div>
            <CheckCircle2 className="mx-auto mb-0.5 h-4 w-4 text-emerald-500" aria-hidden />
            <p className="text-xs text-muted-foreground">
              {Number(ligne.carburant_litres_total).toFixed(1)} L
            </p>
          </div>
        ) : (
          <Clock className="mx-auto h-4 w-4 text-amber-500" aria-hidden />
        )}
      </TableCell>
      <TableCell className="text-center">
        <CelluleCheck ok={ligne.dvir_post_count > 0} />
      </TableCell>
      <TableCell>
        <ApercuPreuveCloture
          modeRendu={ligne.preuve_mode_rendu}
          valeur={ligne.preuve_valeur}
          type={ligne.preuve_type}
          registration={ligne.registration}
        />
      </TableCell>
      <TableCell>
        {ligne.cloture_statut === "validated" ? (
          <div>
            <CheckCircle2 className="mb-0.5 h-4 w-4 text-emerald-500" aria-hidden />
            <p className="text-xs text-muted-foreground">
              {ligne.cloture_revenue_declared?.toLocaleString("fr-FR")} XAF
            </p>
          </div>
        ) : ligne.cloture_statut === "pending" ? (
          <div>
            <Badge variant="warning" className="text-xs">
              En attente
            </Badge>
            {ligne.cloture_revenue_declared != null ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ligne.cloture_revenue_declared.toLocaleString("fr-FR")} XAF
                {ligne.cloture_revenue_gap != null ? (
                  <span
                    className={cn(
                      "ml-1",
                      ligne.cloture_revenue_gap < 0 ? "text-red-500" : "text-emerald-500",
                    )}
                  >
                    ({ligne.cloture_revenue_gap > 0 ? "+" : ""}
                    {ligne.cloture_revenue_gap.toLocaleString("fr-FR")})
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : ligne.cloture_statut === "rejected" ? (
          <div className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-500" aria-hidden />
            <span className="text-xs text-red-500">Rejeté</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <BadgeStatut statut={ligne.statut_global} />
      </TableCell>
      <TableCell>
        {ligne.cloture_id && ligne.cloture_statut === "pending" ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={() => onValider(ligne.creneau_id, ligne.cloture_id!)}
              disabled={validationEnCours === ligne.creneau_id}
              className="h-6 px-2 text-xs"
              aria-label="Valider"
            >
              {validationEnCours === ligne.creneau_id ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                "✓"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRejeter(ligne.cloture_id!)}
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              aria-label="Rejeter"
            >
              ✗
            </Button>
          </div>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
