import { Link } from "react-router-dom";
import { ClipboardCheck, Flag, PlayCircle, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/navigation/routePaths";

interface DriverQuickActionsProps {
  /** Créneau ouvert : priorité à la clôture ; sinon ouverture sur le terrain. */
  hasActiveShift?: boolean;
}

/** CTA principaux conducteur : créneau, véhicule, signalement. */
export function DriverQuickActions({ hasActiveShift = false }: DriverQuickActionsProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {hasActiveShift ? (
        <Button className="w-full sm:w-auto" asChild>
          <Link to={ROUTE_PATHS.dashboardShiftClosure}>
            <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden />
            Clôture de créneau
          </Link>
        </Button>
      ) : (
        <Button className="w-full sm:w-auto" asChild>
          <Link to={ROUTE_PATHS.terrain}>
            <PlayCircle className="mr-2 h-4 w-4" aria-hidden />
            Ouvrir un créneau
          </Link>
        </Button>
      )}
      <Button variant="secondary" className="w-full sm:w-auto" asChild>
        <Link to={ROUTE_PATHS.dashboardMyVehicle}>
          <Truck className="mr-2 h-4 w-4" aria-hidden />
          Mon véhicule
        </Link>
      </Button>
      <Button variant="outline" className="w-full sm:w-auto" asChild>
        <Link to={ROUTE_PATHS.dashboardIncidents}>
          <Flag className="mr-2 h-4 w-4" aria-hidden />
          Signaler un problème
        </Link>
      </Button>
    </div>
  );
}
