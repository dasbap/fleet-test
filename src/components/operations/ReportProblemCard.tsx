import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/** Bloc mis en avant pour orienter le conducteur vers la création d’incident. */
export function ReportProblemCard() {
  return (
    <Card className="border-l-4 border-l-destructive/40 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
          Signaler un problème
        </CardTitle>
        <CardDescription>
          Anomalie véhicule, incident de route ou danger — le gestionnaire en est informé.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" asChild>
          <Link to={ROUTE_PATHS.dashboardIncidents}>Accéder aux incidents</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
