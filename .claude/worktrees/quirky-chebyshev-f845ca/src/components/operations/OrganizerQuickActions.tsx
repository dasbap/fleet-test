import { Link } from "react-router-dom";
import { BarChart3, Truck, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Raccourcis principaux pour superviseur / organisateur. */
export function OrganizerQuickActions() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button className="w-full sm:w-auto" asChild>
        <Link to="/dashboard/drivers">
          <Users className="mr-2 h-4 w-4" aria-hidden />
          Équipes & missions
        </Link>
      </Button>
      <Button variant="secondary" className="w-full sm:w-auto" asChild>
        <Link to="/dashboard/incidents">
          <AlertTriangle className="mr-2 h-4 w-4" aria-hidden />
          Incidents
        </Link>
      </Button>
      <Button variant="outline" className="w-full sm:w-auto" asChild>
        <Link to="/dashboard/reports">
          <BarChart3 className="mr-2 h-4 w-4" aria-hidden />
          Rapports
        </Link>
      </Button>
      <Button variant="outline" className="w-full sm:w-auto" asChild>
        <Link to="/dashboard/vehicles">
          <Truck className="mr-2 h-4 w-4" aria-hidden />
          Parc véhicules
        </Link>
      </Button>
    </div>
  );
}
