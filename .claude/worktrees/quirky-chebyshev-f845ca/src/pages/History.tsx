import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History as HistoryIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveAssignments } from "@/hooks/useAssignments";
import { useVehicleHistory } from "@/hooks/useVehicleHistory";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const History = () => {
  const { user, userFleetId } = useAuth();
  const [visibleCount, setVisibleCount] = useState(12);
  const { data: assignments = [], isLoading } = useActiveAssignments(userFleetId ?? undefined);
  const vehicleId = useMemo(() => {
    if (!user) return undefined;
    return assignments.find((assignment) => assignment.driver_user_id === user.id)?.vehicle?.id;
  }, [assignments, user]);
  const { data: history, isLoading: isLoadingHistory } = useVehicleHistory(vehicleId);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
          <HistoryIcon className="h-7 w-7" />
          Historique
        </h1>
        <p className="text-muted-foreground mt-1">
          Consultez l'historique des interventions et maintenances
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {(isLoading || isLoadingHistory) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Chargement de l&apos;historique...</span>
            </div>
          )}

          {!isLoading && !isLoadingHistory && !history?.events?.length && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <HistoryIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Aucun historique disponible</h3>
              <p className="text-muted-foreground">
                Les événements apparaîtront après les prochaines opérations sur le véhicule.
              </p>
            </div>
          )}

          {!!history?.events?.length && (
            <div className="space-y-3">
              {history.events.slice(0, visibleCount).map((event) => (
                <div key={event.id} className="rounded-lg border border-border/70 p-3">
                  <p className="text-sm font-semibold">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.at).toLocaleString("fr-FR")}
                  </p>
                  {event.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                  ) : null}
                </div>
              ))}
              {history.events.length > visibleCount ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setVisibleCount((prev) => prev + 12)}
                >
                  Voir plus
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default History;
