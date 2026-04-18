import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/**
 * Sous-route /dashboard inconnue : reste dans le layout (sidebar) au lieu du 404 racine.
 */
export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center px-4">
      <h1 className="text-2xl font-heading font-bold">Page introuvable</h1>
      <p className="text-muted-foreground text-sm">
        Cette adresse ne correspond à aucun écran du tableau de bord. Vérifiez le lien ou
        revenez à l&apos;accueil de la flotte.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center pt-2">
        <Button asChild>
          <Link to={ROUTE_PATHS.dashboard}>Tableau de bord</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={ROUTE_PATHS.dashboardSettings}>Paramètres</Link>
        </Button>
      </div>
    </div>
  );
}
