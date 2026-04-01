import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/**
 * Fiche mission (deep link / navigation interne).
 * Contenu métier à brancher sur MissionService lorsque l’API sera disponible.
 */
export default function OperationsMissionDetailPage() {
  const { missionId } = useParams<{ missionId: string }>();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to={ROUTE_PATHS.dashboardOperations} aria-label="Retour opérations">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold tracking-tight">Mission</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail mission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Identifiant :{" "}
            <span className="font-mono text-foreground">{missionId ?? "—"}</span>
          </p>
          <p>Les données terrain seront affichées ici une fois le flux missions connecté.</p>
        </CardContent>
      </Card>
    </div>
  );
}
