import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InterventionCard } from "@/components/operations/InterventionCard";
import {
  MechanicActionsBlock,
  MechanicDiagnosticsBlock,
} from "@/components/operations/MechanicInsightBlocks";
import { MechanicSummaryStrip } from "@/components/operations/MechanicSummaryStrip";
import { OperationSection } from "@/components/operations/OperationSection";
import { OperationsEmptyState } from "@/components/operations/OperationsEmptyState";
import { OperationsViewSkeleton } from "@/components/operations/OperationsViewSkeleton";
import { OperationsQueryMessage } from "@/components/operations/OperationsQueryMessage";
import { useAuth } from "@/hooks/useAuth";
import { useMechanicOperations } from "@/hooks/useOperations";

/** Vue mécanicien : synthèse atelier, interventions, véhicules assignés, clôtures. */
export function MechanicOperationsView() {
  const { userFleetId, isLoading: authLoading } = useAuth();
  const { data: payload, isPending, isError, error } = useMechanicOperations();

  if (authLoading) {
    return <OperationsViewSkeleton />;
  }
  if (!userFleetId) {
    return <OperationsQueryMessage variant="no-fleet" />;
  }
  if (isPending) {
    return <OperationsViewSkeleton />;
  }
  if (isError) {
    return <OperationsQueryMessage variant="error" message={error.message} />;
  }
  if (!payload) {
    return null;
  }

  const { interventionsToday, summary } = payload;
  const plates = [...new Set(interventionsToday.map((i) => `${i.vehicleLabel} (${i.plate})`))];
  const aCloturer = interventionsToday.filter((i) => i.canClose);

  return (
    <div className="space-y-6 sm:space-y-8">
      <MechanicSummaryStrip
        diagnosticsEnCours={summary.diagnosticsEnCours}
        actionsRealisees={summary.actionsRealisees}
        cloturesPossibles={summary.cloturesPossibles}
      />

      <OperationSection
        title="Interventions du jour"
        description="Fiches détaillées : priorité, diagnostic, actions et accès maintenance."
      >
        {interventionsToday.length === 0 ? (
          <OperationsEmptyState message="Aucune intervention chargée pour aujourd’hui — vérifiez le planning maintenance." />
        ) : (
          <div className="space-y-4">
            {interventionsToday.map((inv) => (
              <InterventionCard key={inv.id} intervention={inv} />
            ))}
          </div>
        )}
      </OperationSection>

      <OperationSection title="Véhicules assignés" description="Parc concerné par vos dossiers du jour.">
        {plates.length === 0 ? (
          <OperationsEmptyState message="Aucun véhicule rattaché à vos dossiers." />
        ) : (
          <Card>
            <CardContent className="p-4">
              <ul className="flex flex-wrap gap-2">
                {plates.map((p) => (
                  <li key={p}>
                    <Badge variant="outline" className="font-normal">
                      {p}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </OperationSection>

      <OperationSection title="Diagnostic" description="Synthèse des constats saisis sur les dossiers du jour.">
        <MechanicDiagnosticsBlock interventions={interventionsToday} />
      </OperationSection>

      <OperationSection title="Actions réalisées" description="Pièces et opérations enregistrées sur la journée.">
        <MechanicActionsBlock interventions={interventionsToday} />
      </OperationSection>

      <OperationSection
        title="Clôture d’intervention"
        description="Dossiers prêts à être soldés dans l’atelier."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/maintenance">Planning maintenance</Link>
          </Button>
        }
      >
        {aCloturer.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
            Aucune clôture en attente pour le moment.
          </p>
        ) : (
          <ul className="space-y-2">
            {aCloturer.map((inv) => (
              <li key={inv.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {inv.vehicleLabel}{" "}
                        <span className="font-mono text-sm text-muted-foreground">({inv.plate})</span>
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{inv.diagnostic}</p>
                    </div>
                    <Button size="sm" asChild>
                      <Link to={inv.href}>Clôturer l’intervention</Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </OperationSection>
    </div>
  );
}
