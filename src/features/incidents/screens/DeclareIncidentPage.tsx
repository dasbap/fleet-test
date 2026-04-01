import { useState } from "react";
import { Link, useSearchParams, Navigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IncidentDeclarationForm } from "@/features/incidents/components/IncidentDeclarationForm";

const CAN_DECLARE = new Set(["driver", "organizer", "manager", "mechanic"]);

/**
 * Parcours mobile « Déclarer un incident » : formulaire plein écran + confirmation.
 */
export default function DeclareIncidentPage() {
  const { userFleetId, role, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const vehicleId = searchParams.get("vehicleId") ?? undefined;
  const [finished, setFinished] = useState(false);

  if (isLoading) {
    return (
      <div className="text-muted-foreground p-4 text-sm" role="status">
        Chargement…
      </div>
    );
  }

  if (!CAN_DECLARE.has(role ?? "")) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!userFleetId) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <Alert variant="destructive">
          <AlertTitle>Flotte requise</AlertTitle>
          <AlertDescription>
            Associez-vous à une flotte avant de signaler un incident.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-10">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to="/dashboard" aria-label="Retour à l’accueil">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-xl font-bold">Déclarer un incident</h1>
          <p className="text-muted-foreground text-sm">Signalement terrain Flotte E-Samba</p>
        </div>
      </header>

      {finished ? (
        <Alert className="border-primary/40 bg-primary/5">
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
          <AlertTitle>Confirmation</AlertTitle>
          <AlertDescription>
            Votre demande a bien été prise en compte. Vous pouvez retourner à l’accueil ou consulter
            la liste des incidents.
          </AlertDescription>
        </Alert>
      ) : null}

      {!finished ? (
        <IncidentDeclarationForm
          fleetId={userFleetId}
          defaultVehicleId={vehicleId}
          onComplete={() => setFinished(true)}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <Button asChild variant="default">
            <Link to="/dashboard">Retour à l’accueil</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/incidents">Voir les incidents</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
