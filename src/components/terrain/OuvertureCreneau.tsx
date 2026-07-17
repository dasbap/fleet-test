import { useMemo, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useActiveAssignments } from "@/hooks/useAssignments";
import { useActiveShift, useStartShift } from "@/hooks/useDriverShifts";
import { useUpcomingPlannedShift } from "@/hooks/usePlannedShifts";
import { CreneauEnCoursCard } from "@/components/terrain/CreneauEnCoursCard";

function parsePositiveNumber(raw: string): number | null {
  const n = Number(String(raw).replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Ouverture d'un créneau conducteur (km départ + créneau planifié). */
export function OuvertureCreneau() {
  const { user, userFleetId } = useAuth();
  const { data: rawAssignments, isPending: assignmentsPending } = useActiveAssignments(
    userFleetId ?? undefined,
  );
  const myAssignment = useMemo(() => {
    const list = rawAssignments ?? [];
    return user ? list.find((a) => a.driver_user_id === user.id) : null;
  }, [rawAssignments, user]);
  const { data: creneauActif, isPending: shiftPending } = useActiveShift({
    refetchOnWindowFocus: false,
  });
  const { data: upcomingPlanned } = useUpcomingPlannedShift();
  const startShift = useStartShift();

  const [kmDepart, setKmDepart] = useState("");
  const kmDepartOk = parsePositiveNumber(kmDepart);

  const handleOpenShift = () => {
    if (!myAssignment) return;
    const km = parsePositiveNumber(kmDepart);
    if (km === null) return;
    startShift.mutate({
      assignment_id: myAssignment.id,
      km_start: Math.round(km),
    });
  };

  const canOpenShift =
    Boolean(myAssignment) && kmDepartOk !== null && !startShift.isPending;

  if (shiftPending) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement du créneau…
        </CardContent>
      </Card>
    );
  }

  if (creneauActif) {
    return <CreneauEnCoursCard creneau={creneauActif} />;
  }

  return (
    <>
      {upcomingPlanned ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-medium">Créneau prévu</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(upcomingPlanned.planned_start).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {upcomingPlanned.vehicle?.registration
                    ? ` · ${upcomingPlanned.vehicle.registration}`
                    : ""}
                </p>
              </div>
            </div>
            {myAssignment && kmDepartOk !== null ? (
              <Button
                type="button"
                size="sm"
                disabled={startShift.isPending}
                onClick={handleOpenShift}
              >
                Ouvrir maintenant
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Créneau</CardTitle>
          <CardDescription>
            Démarrez votre service sur le véhicule affecté.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignmentsPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Chargement…
            </div>
          ) : null}

          {!assignmentsPending && !myAssignment ? (
            <p className="text-sm text-muted-foreground">
              Aucun véhicule assigné. Contactez votre gestionnaire de flotte pour une affectation.
            </p>
          ) : null}

          {!assignmentsPending && myAssignment ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="terrain-km-depart">Kilométrage départ</Label>
                <Input
                  id="terrain-km-depart"
                  inputMode="decimal"
                  placeholder="Ex. 45230"
                  value={kmDepart}
                  onChange={(ev) => setKmDepart(ev.target.value)}
                />
              </div>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={!canOpenShift}
                onClick={handleOpenShift}
              >
                {startShift.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                Ouvrir créneau
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
