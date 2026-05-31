import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MissionCard } from "@/components/operations/MissionCard";
import { PlannedShiftPlannerModal } from "@/components/operations/PlannedShiftPlannerModal";
import { PendingClosuresSection } from "@/components/operations/PendingClosuresSection";
import { ManagerIncidentCard } from "@/components/operations/ManagerIncidentCard";
import { ManagerSummaryGrid } from "@/components/operations/ManagerSummaryGrid";
import { ScheduledMaintenanceRow } from "@/components/operations/ScheduledMaintenanceRow";
import { OperationSection } from "@/components/operations/OperationSection";
import { OperationsViewSkeleton } from "@/components/operations/OperationsViewSkeleton";
import { OperationsQueryMessage } from "@/components/operations/OperationsQueryMessage";
import { OperationsEmptyState } from "@/components/operations/OperationsEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useManagerOperations } from "@/hooks/useOperations";
import { usePlannedShiftsForFleetToday } from "@/hooks/usePlannedShifts";

/** Vue gestionnaire de flotte : synthèse, incidents parc, maintenance planifiée. */
export function ManagerOperationsView() {
  const { userFleetId, isLoading: authLoading } = useAuth();
  const { data: operations, isPending, isError, error } = useManagerOperations();
  const { data: plannedToday = [] } = usePlannedShiftsForFleetToday(userFleetId ?? undefined);

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

      <PendingClosuresSection fleetId={userFleetId} />

      <OperationSection
        title="Planning créneaux"
        description="Planifier les services conducteurs du jour."
        action={userFleetId ? <PlannedShiftPlannerModal fleetId={userFleetId} /> : null}
      >
        {plannedToday.length === 0 ? (
          <OperationsEmptyState message="Aucun créneau planifié. Utilisez le bouton ci-dessus pour en créer un." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {plannedToday.map((p) => (
              <MissionCard
                key={p.id}
                mission={{
                  id: p.id,
                  title: `Planifié · ${p.vehicle?.registration ?? "—"}`,
                  subtitle: p.notes ?? undefined,
                  vehicleLabel: p.vehicle?.registration ?? "—",
                  timeWindow: new Date(p.planned_start).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  status: p.status === "started" ? "in_progress" : "planned",
                  href: "/terrain",
                }}
                ctaLabel="Détails"
              />
            ))}
          </div>
        )}
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
