import { Link } from "react-router-dom";
import { BarChart3, Truck, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/** Raccourcis principaux pour superviseur / organisateur. */
export function OrganizerQuickActions() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button className="w-full sm:w-auto" asChild>
        <Link to={ROUTE_PATHS.dashboardDrivers}>
          <Users className="mr-2 h-4 w-4" aria-hidden />
          Équipes & missions
        </Link>
      </Button>
      <Button variant="secondary" className="w-full sm:w-auto" asChild>
        <Link to={ROUTE_PATHS.dashboardIncidents}>
          <AlertTriangle className="mr-2 h-4 w-4" aria-hidden />
          Incidents
        </Link>
      </Button>
      <Button variant="outline" className="w-full sm:w-auto" asChild>
        <Link to={ROUTE_PATHS.dashboardReports}>
          <BarChart3 className="mr-2 h-4 w-4" aria-hidden />
          Rapports
        </Link>
      </Button>
      <Button variant="outline" className="w-full sm:w-auto" asChild>
        <Link to={ROUTE_PATHS.dashboardVehicles}>
          <Truck className="mr-2 h-4 w-4" aria-hidden />
          Parc véhicules
        </Link>
      </Button>
    </div>
  );
}
