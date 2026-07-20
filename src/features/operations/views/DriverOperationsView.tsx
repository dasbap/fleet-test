import { FicheCreneauActif } from "@/components/terrain/FicheCreneauActif";
import { ClotureCreneau } from "@/components/terrain/ClotureCreneau";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChecklistCard } from "@/components/operations/ChecklistCard";
import { OperationSection } from "@/components/operations/OperationSection";
import { OperationStatusBadge } from "@/components/operations/OperationStatusBadge";
import { DriverQuickActions } from "@/components/operations/DriverQuickActions";
import { ReportProblemCard } from "@/components/operations/ReportProblemCard";
import { OperationsViewSkeleton } from "@/components/operations/OperationsViewSkeleton";
import { OperationsQueryMessage } from "@/components/operations/OperationsQueryMessage";
import { useAuth } from "@/hooks/useAuth";
import { useActiveShift } from "@/hooks/useDriverShifts";
import { useDriverOperations } from "@/hooks/useOperations";
import { useDriverOperationalChecklists } from "@/hooks/useDriverOperationalChecklists";
import type { MockDriverDay } from "@/features/operations/mocks/operationsMock";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/** Vue conducteur : mission, véhicule, checklists départ / arrivée. */
export function DriverOperationsView() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: day, isPending, isError, error } = useDriverOperations();

  if (authLoading) {
    return <OperationsViewSkeleton />;
  }
  if (!user?.id) {
    return <OperationsQueryMessage variant="error" message="Session requise pour afficher votre mission." />;
  }
  if (isPending) {
    return <OperationsViewSkeleton />;
  }
  if (isError) {
    return <OperationsQueryMessage variant="error" message={error.message} />;
  }
  if (!day) {
    return null;
  }

  const hasActiveShift = day.missionStatus === "in_progress";
  const hasVehicleAssignment = day.vehiclePlate !== "—";

  return (
    <DriverOperationsContent
      day={day}
      hasActiveShift={hasActiveShift}
      hasVehicleAssignment={hasVehicleAssignment}
    />
  );
}

function DriverOperationsContent({
  day,
  hasActiveShift,
  hasVehicleAssignment,
}: {
  day: MockDriverDay;
  hasActiveShift: boolean;
  hasVehicleAssignment: boolean;
}) {
  const { departure, arrival, toggleDepartureItem, toggleArrivalItem } =
    useDriverOperationalChecklists(day);
  const { data: activeShift } = useActiveShift({ refetchOnWindowFocus: false });

  return (
    <div className="space-y-6 sm:space-y-8">
      <DriverQuickActions hasActiveShift={hasActiveShift} />

      <OperationSection title="Ma mission du jour" description={day.missionRoute}>
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CardTitle className="font-heading text-lg">{day.missionTitle}</CardTitle>
              <OperationStatusBadge status={day.missionStatus} />
            </div>
            <p className="text-sm text-muted-foreground">{day.missionTime}</p>
          </CardHeader>
          <CardContent>
            {hasActiveShift ? (
              <p className="text-sm text-muted-foreground">
                Complétez la clôture dans le formulaire ci-dessous.
              </p>
            ) : hasVehicleAssignment ? (
              <Button asChild>
                <Link to={ROUTE_PATHS.terrain}>Ouvrir un créneau sur le terrain</Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune affectation active — contactez votre superviseur pour être assigné à un véhicule.
              </p>
            )}
          </CardContent>
        </Card>
      </OperationSection>

      {day.activeShiftId ? (
        <>
          <FicheCreneauActif creneauId={day.activeShiftId} />
          {activeShift ? (
            <ClotureCreneau
              activeShift={activeShift}
              successRedirect={ROUTE_PATHS.dashboardOperations}
            />
          ) : null}
        </>
      ) : null}

      <OperationSection title="Mon véhicule" description="Matériel assigné pour cette mission.">
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-lg font-semibold">{day.vehicleLabel}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="font-mono">
                  {day.vehiclePlate}
                </Badge>
                <Badge variant="secondary">{day.vehicleKm}</Badge>
              </div>
            </div>
            {hasVehicleAssignment ? (
              <Button variant="secondary" asChild>
                <Link to={ROUTE_PATHS.dashboardMyVehicle}>Fiche véhicule</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </OperationSection>

      <OperationSection title="Checklist départ" description="Contrôles avant de prendre la route.">
        <ChecklistCard
          checklist={departure}
          onToggleItem={toggleDepartureItem}
          showTitle={false}
          dvirLinkLabel="Contrôle détaillé (DVIR pré-départ)"
        />
      </OperationSection>

      <OperationSection title="Checklist arrivée" description="Contrôles en fin de service.">
        <ChecklistCard
          checklist={arrival}
          onToggleItem={toggleArrivalItem}
          showTitle={false}
          dvirLinkLabel="Contrôle détaillé (DVIR post-trajet)"
        />
      </OperationSection>

      <OperationSection title="Signaler un problème" description="Incident, panne ou situation dangereuse.">
        <ReportProblemCard />
      </OperationSection>
    </div>
  );
}
