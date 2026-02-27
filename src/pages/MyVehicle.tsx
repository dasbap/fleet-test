import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveAssignments } from "@/hooks/useAssignments";

// Affiche le véhicule assigné au conducteur connecté (affectation active).

const MyVehicle = () => {
  const { user, userFleetId } = useAuth();
  const { data: assignments = [], isLoading, error: queryError } = useActiveAssignments(userFleetId ?? undefined);
  const myAssignment = user ? assignments.find((a) => a.driver_user_id === user.id) : null;
  const vehicle = myAssignment?.vehicle ?? null;
  const error = queryError ? "Erreur lors de la récupération de l'affectation véhicule." : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
          <Car className="h-7 w-7" />
          Mon véhicule
        </h1>
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
    </div>
  );
};

export default MyVehicle;
