import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ManagerIncidentCard } from "@/components/operations/ManagerIncidentCard";
import { ManagerSummaryGrid } from "@/components/operations/ManagerSummaryGrid";
import { ScheduledMaintenanceRow } from "@/components/operations/ScheduledMaintenanceRow";
import { OperationSection } from "@/components/operations/OperationSection";
import { OperationsViewSkeleton } from "@/components/operations/OperationsViewSkeleton";
import { OperationsQueryMessage } from "@/components/operations/OperationsQueryMessage";
import { OperationsEmptyState } from "@/components/operations/OperationsEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useManagerOperations } from "@/hooks/useOperations";

/** Vue gestionnaire de flotte : synthèse, incidents parc, maintenance planifiée. */
export function ManagerOperationsView() {
  const { userFleetId, isLoading: authLoading } = useAuth();
  const { data: operations, isPending, isError, error } = useManagerOperations();

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
  if (!operations) {
    return null;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <OperationSection title="Vue synthétique des opérations" description="Indicateurs consolidés pour le parc.">
        <ManagerSummaryGrid stats={operations.summary} />
      </OperationSection>

      <OperationSection title="Incidents impactant le parc" description="Priorisation et périmètre véhicules.">
        {operations.incidents.length === 0 ? (
          <OperationsEmptyState message="Aucun incident à afficher dans cette synthèse." />
        ) : (
          <div className="space-y-3">
            {operations.incidents.map((inc) => (
              <ManagerIncidentCard key={inc.id} incident={inc} />
            ))}
          </div>
        )}
      </OperationSection>

      <OperationSection
        title="Maintenance programmée"
        description="Interventions planifiées sur le parc."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/maintenance">Tout le planning</Link>
          </Button>
        }
      >
        {operations.scheduledMaintenance.length === 0 ? (
          <OperationsEmptyState message="Aucune maintenance planifiée à l’horizon dans cette vue." />
        ) : (
          <div className="space-y-3">
            {operations.scheduledMaintenance.map((sm) => (
              <ScheduledMaintenanceRow key={sm.id} item={sm} />
            ))}
          </div>
        )}
      </OperationSection>
    </div>
  );
}
