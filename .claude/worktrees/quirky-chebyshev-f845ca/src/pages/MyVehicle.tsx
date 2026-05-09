import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Loader2, QrCode } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveAssignments } from "@/hooks/useAssignments";
import { useVehicleHistory } from "@/hooks/useVehicleHistory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { useNetworkOnline } from "@/features/account/hooks/useNetworkOnline";

// Affiche le véhicule assigné au conducteur connecté (affectation active).

const MyVehicle = () => {
  const { user, userFleetId } = useAuth();
  const online = useNetworkOnline();
  const { data: assignments = [], isLoading, error: queryError } = useActiveAssignments(userFleetId ?? undefined);
  const myAssignment = user ? assignments.find((a) => a.driver_user_id === user.id) : null;
  const vehicle = myAssignment?.vehicle ?? null;
  const { data: history } = useVehicleHistory(vehicle?.id);
  const error = queryError ? "Erreur lors de la récupération de l'affectation véhicule." : null;
  const isOfflineConsultable = !online && !isLoading && !error && !!vehicle;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
          <Car className="h-7 w-7" />
          Mon véhicule
        </h1>
        {isOfflineConsultable ? (
          <Badge variant="outline" className="mt-2 border-warning/30 text-warning">
            Consultable hors ligne
          </Badge>
        ) : null}
        <p className="text-muted-foreground mt-1">
          Consultez les informations de votre véhicule assigné
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mon véhicule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Chargement du véhicule...</span>
              </div>
            )}

            {!isLoading && error && (
              <p className="text-destructive">{error}</p>
            )}

            {!isLoading && !error && !vehicle && (
              <>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Car className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Aucun véhicule assigné
                </h3>
                <p className="text-muted-foreground">
                  Vous n&apos;avez actuellement aucun véhicule assigné.
                </p>
              </>
            )}

            {!isLoading && !error && vehicle && (
              <>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Car className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {vehicle.brand ?? "Marque inconnue"} {vehicle.model ?? ""}
                </h3>
                <div className="text-muted-foreground text-base">
                  {vehicle.registration && (
                    <span className="font-mono">
                      Immatriculation : {vehicle.registration}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {vehicle && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Historique récent</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link to={ROUTE_PATHS.dashboardScan}>
                <QrCode className="mr-2 h-4 w-4" />
                Scanner
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!history && (
              <p className="text-sm text-muted-foreground">
                Aucun historique local disponible pour ce véhicule.
              </p>
            )}
            {history?.events?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun événement trouvé pour ce véhicule.
              </p>
            )}
            {history?.events && history.events.length > 0 && (
              <div className="space-y-3">
                {history.events.slice(0, 8).map((event) => (
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
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyVehicle;
