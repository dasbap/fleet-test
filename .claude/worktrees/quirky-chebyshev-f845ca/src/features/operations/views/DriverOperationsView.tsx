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
import { useDriverOperations } from "@/hooks/useOperations";

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

  return (
    <div className="space-y-6 sm:space-y-8">
      <DriverQuickActions />

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
            <Button asChild>
              <Link to="/dashboard/closure">Accéder à la clôture</Link>
            </Button>
          </CardContent>
        </Card>
      </OperationSection>

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
            <Button variant="secondary" asChild>
              <Link to="/dashboard/my-vehicle">Fiche véhicule</Link>
            </Button>
          </CardContent>
        </Card>
      </OperationSection>

      <OperationSection title="Checklist départ" description="Contrôles avant de prendre la route.">
        <ChecklistCard checklist={day.departureChecklist} />
      </OperationSection>

      <OperationSection title="Checklist arrivée" description="Contrôles en fin de service.">
        <ChecklistCard checklist={day.arrivalChecklist} />
      </OperationSection>

      <OperationSection title="Signaler un problème" description="Incident, panne ou situation dangereuse.">
        <ReportProblemCard />
      </OperationSection>
    </div>
  );
}
