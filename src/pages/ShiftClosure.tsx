import { Link } from "react-router-dom";
import { FicheCreneauActif } from "@/components/terrain/FicheCreneauActif";
import { ClotureCreneau } from "@/components/terrain/ClotureCreneau";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveShift } from "@/hooks/useDriverShifts";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { Lock, Loader2 } from "lucide-react";
import { ContextualHelpTrigger } from "@/components/help/ContextualHelpTrigger";

const ShiftClosure = () => {
  const { can } = useRoleAccess();
  const canSubmitDvir = can("dvir.submit");
  const { data: activeShift, isPending } = useActiveShift({ refetchOnWindowFocus: false });

  if (!canSubmitDvir) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Accès réservé aux conducteurs et superviseurs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold">Clôture journalière</h1>
        <p className="text-muted-foreground mt-1">
          Déclarez vos kilomètres et recettes du jour
        </p>
        <ContextualHelpTrigger slug="shift-closure" className="mt-2" />
      </div>

      {isPending ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Chargement du créneau en cours…
          </CardContent>
        </Card>
      ) : null}

      {!isPending && !activeShift ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading">Aucun créneau ouvert</CardTitle>
            <CardDescription>
              Ouvrez d&apos;abord un créneau depuis le hub terrain pour clôturer votre service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={ROUTE_PATHS.terrain}>Ouvrir un créneau</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isPending && activeShift ? (
        <>
          <FicheCreneauActif creneauId={activeShift.id} />
          <ClotureCreneau activeShift={activeShift} />
        </>
      ) : null}
    </div>
  );
};

export default ShiftClosure;
