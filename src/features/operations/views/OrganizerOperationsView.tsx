import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MissionCard } from "@/components/operations/MissionCard";
import { TaskRowCard } from "@/components/operations/TaskRowCard";
import { VehicleCirculationCard } from "@/components/operations/VehicleCirculationCard";
import { OperationSection } from "@/components/operations/OperationSection";
import { OrganizerQuickActions } from "@/components/operations/OrganizerQuickActions";
import { PendingClosuresSection } from "@/components/operations/PendingClosuresSection";
import { OperationsViewSkeleton } from "@/components/operations/OperationsViewSkeleton";
import { OperationsQueryMessage } from "@/components/operations/OperationsQueryMessage";
import { OperationsEmptyState } from "@/components/operations/OperationsEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizerOperations } from "@/hooks/useOperations";

/** Vue superviseur / organisateur : missions, circulation, incidents, tâches. */
export function OrganizerOperationsView() {
  const { userFleetId, isLoading: authLoading } = useAuth();
  const { data: operations, isPending, isError, error } = useOrganizerOperations();

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
      <OrganizerQuickActions />

      <PendingClosuresSection fleetId={userFleetId} />

      <OperationSection
        title="Créneaux planifiés aujourd'hui"
        description="Services confirmés ou manqués, en attente de démarrage."
      >
        {operations.plannedShiftsToday.length === 0 ? (
          <OperationsEmptyState message="Aucun créneau planifié pour aujourd'hui." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {operations.plannedShiftsToday.map((m) => (
              <MissionCard key={m.id} mission={m} ctaLabel="Voir le terrain" />
            ))}
          </div>
        )}
      </OperationSection>

      <OperationSection title="Missions du jour" description="Planning et suivi des tournées.">
        {operations.missionsToday.length === 0 ? (
          <OperationsEmptyState message="Aucune mission ouverte pour aujourd’hui. Les créneaux actifs apparaîtront ici." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {operations.missionsToday.map((m) => (
              <MissionCard key={m.id} mission={m} ctaLabel="Suivre la mission" />
            ))}
          </div>
        )}
      </OperationSection>

      <OperationSection title="Véhicules en circulation" description="Engins actuellement en service avec itinéraire.">
        {operations.vehiclesInService.length === 0 ? (
          <OperationsEmptyState message="Aucun véhicule en circulation pour le moment." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {operations.vehiclesInService.map((v) => (
              <VehicleCirculationCard key={v.id} label={v.label} driver={v.driver} route={v.route} />
            ))}
          </div>
        )}
      </OperationSection>

      <OperationSection title="Incidents opérationnels" description="Signalements nécessitant un suivi.">
        {operations.operationalIncidents.length === 0 ? (
          <OperationsEmptyState message="Aucun incident récent à traiter dans cette vue." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {operations.operationalIncidents.map((m) => (
              <MissionCard key={m.id} mission={m} ctaLabel="Voir l’incident" />
            ))}
          </div>
        )}
      </OperationSection>

      <OperationSection
        title="Tâches assignées"
        description="Actions attendant votre validation ou relance."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/alerts">Centre d’alertes</Link>
          </Button>
        }
      >
        {operations.assignedTasks.length === 0 ? (
          <OperationsEmptyState message="Aucune tâche assignée pour la régulation." />
        ) : (
          <div className="space-y-2">
            {operations.assignedTasks.map((t) => (
              <TaskRowCard key={t.id} task={t} />
            ))}
          </div>
        )}
      </OperationSection>
    </div>
  );
}
