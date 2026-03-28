import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { Bell, MapPin, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { FleetVehicleListItem } from "@/types/fleet-vehicle";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { cn } from "@/lib/utils";
import { VehicleStatusBadge } from "./VehicleStatusBadge";

interface VehicleCardProps {
  vehicle: FleetVehicleListItem;
  className?: string;
}

/**
 * Carte résumé véhicule (liste grille / mobile).
 */
export function VehicleCard({ vehicle, className }: VehicleCardProps) {
  const to = ROUTE_PATHS.dashboardVehicleDetail(vehicle.id);
  const nextMaint = (() => {
    try {
      return format(new Date(vehicle.nextMaintenanceAt), "d MMM yyyy", {
        locale: fr,
      });
    } catch {
      return "—";
    }
  })();

  return (
    <Link
      to={to}
      className={cn(
        "block rounded-xl outline-none transition-transform active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring touch-manipulation",
        className
      )}
    >
      <Card className="h-full border-border/80 shadow-sm transition-colors hover:bg-muted/35">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono font-semibold text-base tracking-tight">
                {vehicle.registration}
              </p>
              <p className="text-muted-foreground text-sm mt-0.5 line-clamp-2">
                {vehicle.vehicleType} · {vehicle.brand} {vehicle.model}
              </p>
            </div>
            <VehicleStatusBadge availability={vehicle.availability} />
          </div>

          <dl className="grid gap-2 text-sm">
            <div className="flex items-start gap-2">
              <Wrench
                className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5"
                aria-hidden
              />
              <div>
                <dt className="text-muted-foreground text-xs">Prochain entretien</dt>
                <dd className="font-medium">{nextMaint}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin
                className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5"
                aria-hidden
              />
              <div>
                <dt className="text-muted-foreground text-xs">
                  Dernière localisation
                </dt>
                <dd className="font-medium line-clamp-2">
                  {vehicle.lastKnownLocation}
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Bell
                className={cn(
                  "h-4 w-4 shrink-0",
                  vehicle.openAlertsCount > 0 ? "text-warning" : "text-muted-foreground"
                )}
                aria-hidden
              />
              <span className="text-muted-foreground text-xs">Alertes ouvertes</span>
              <span
                className={cn(
                  "ml-auto font-semibold tabular-nums",
                  vehicle.openAlertsCount > 0 && "text-warning"
                )}
              >
                {vehicle.openAlertsCount}
              </span>
            </div>
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}
