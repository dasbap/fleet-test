import { Link } from "react-router-dom";
import ShiftClosureForm from "@/components/driver/ShiftClosureForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveShift } from "@/hooks/useDriverShifts";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { Car, Clock, Gauge, Lock, Loader2 } from "lucide-react";
import { ContextualHelpTrigger } from "@/components/help/ContextualHelpTrigger";

const ShiftClosure = () => {
  const { can } = useRoleAccess();
  const canSubmitDvir = can("dvir.submit");
  const { data: activeShift, isPending } = useActiveShift();

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  };

  if (!canSubmitDvir) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Accès réservé aux conducteurs et superviseurs.</p>
      </div>
    );
  }

  const vehicle = activeShift?.assignment?.vehicle;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold">Clôture journalière</h1>
        <p className="text-muted-foreground mt-1">
          Déclarez vos kilomètres et recettes du jour
        </p>
        <ContextualHelpTrigger slug="shift-closure" className="mt-2" />
      </div>

      {isPending ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Chargement du créneau en cours…
          </CardContent>
        </Card>
      ) : null}

      {!isPending && !activeShift ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">Aucun créneau ouvert</CardTitle>
            <CardDescription>
              Ouvrez d&apos;abord un créneau depuis le hub terrain pour clôturer votre service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={ROUTE_PATHS.terrain}>Ouvrir un créneau</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isPending && activeShift ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading">Service en cours</CardTitle>
              <CardDescription>Informations sur votre service actif</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Véhicule</div>
                    {vehicle ? (
                      <>
                        <div className="font-semibold">{vehicle.registration}</div>
                        <div className="text-xs text-muted-foreground">
                          {[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}
                        </div>
                      </>
                    ) : (
                      <Skeleton className="h-5 w-24" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Gauge className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">KM départ</div>
                    <div className="font-semibold">
                      {activeShift.km_start.toLocaleString()} km
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Durée</div>
                    <div className="font-semibold">{formatDuration(activeShift.started_at)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <ShiftClosureForm shiftId={activeShift.id} kmStart={activeShift.km_start} />
        </>
      ) : null}
    </div>
  );
};

export default ShiftClosure;
