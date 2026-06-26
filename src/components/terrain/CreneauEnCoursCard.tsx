import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationStatusBadge } from "@/components/operations/OperationStatusBadge";
import type { DriverShift } from "@/hooks/useDriverShifts";

interface CreneauEnCoursCardProps {
  creneau: DriverShift;
}

/** Bloc statut « Créneau en cours » (avant la fiche de clôture). */
export function CreneauEnCoursCard({ creneau }: CreneauEnCoursCardProps) {
  const registration = creneau.assignment?.vehicle?.registration;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="font-heading text-base">Créneau en cours</CardTitle>
          <OperationStatusBadge status="in_progress" />
        </div>
        <CardDescription>
          Démarré à{" "}
          {new Date(creneau.started_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {registration ? ` · ${registration}` : ""}
          {" · km départ "}
          {creneau.km_start.toLocaleString("fr-FR")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Déclarez vos kilomètres et recettes ci-dessous pour clôturer le service.
        </p>
      </CardContent>
    </Card>
  );
}
