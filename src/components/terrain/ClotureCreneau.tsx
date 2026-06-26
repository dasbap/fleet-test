import ShiftClosureForm from "@/components/driver/ShiftClosureForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DriverShift } from "@/hooks/useDriverShifts";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { Car, Clock, Gauge } from "lucide-react";

interface ClotureCreneauProps {
  activeShift: DriverShift;
  /** Route après soumission réussie (défaut : tableau de bord). */
  successRedirect?: string;
}

function formatDuration(startedAt: string) {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}min`;
}

/** Résumé du créneau ouvert + formulaire de clôture conducteur. */
export function ClotureCreneau({
  activeShift,
  successRedirect = ROUTE_PATHS.dashboard,
}: ClotureCreneauProps) {
  const vehicle = activeShift.assignment?.vehicle;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Service en cours</CardTitle>
          <CardDescription>Clôturez votre créneau en déclarant km et recettes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Car className="h-5 w-5 text-primary" aria-hidden />
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

            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Gauge className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">KM départ</div>
                <div className="font-semibold">{activeShift.km_start.toLocaleString("fr-FR")} km</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Durée</div>
                <div className="font-semibold">{formatDuration(activeShift.started_at)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ShiftClosureForm
        shiftId={activeShift.id}
        kmStart={activeShift.km_start}
        successRedirect={successRedirect}
      />
    </div>
  );
}
