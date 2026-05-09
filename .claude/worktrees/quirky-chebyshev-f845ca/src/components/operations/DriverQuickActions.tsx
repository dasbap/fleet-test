import { Link } from "react-router-dom";
import { ClipboardCheck, Flag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

/** CTA principaux conducteur : clôture, véhicule, signalement. */
export function DriverQuickActions() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button className="w-full sm:w-auto" asChild>
        <Link to="/dashboard/closure">
          <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden />
          Clôture de créneau
        </Link>
      </Button>
      <Button variant="secondary" className="w-full sm:w-auto" asChild>
        <Link to="/dashboard/my-vehicle">
          <Truck className="mr-2 h-4 w-4" aria-hidden />
          Mon véhicule
        </Link>
      </Button>
      <Button variant="outline" className="w-full sm:w-auto" asChild>
        <Link to="/dashboard/incidents">
          <Flag className="mr-2 h-4 w-4" aria-hidden />
          Signaler un problème
        </Link>
      </Button>
    </div>
  );
}
