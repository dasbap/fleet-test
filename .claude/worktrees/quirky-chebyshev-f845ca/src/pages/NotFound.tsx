import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn("404 : route inexistante :", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="text-center max-w-md space-y-6">
        <div>
          <h1 className="mb-2 text-4xl font-bold">404</h1>
          <p className="text-xl text-muted-foreground">Page introuvable</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Cette URL ne correspond à aucune page de l&apos;application. Si vous cherchiez le
            tableau de bord, connectez-vous : les pages flotte sont protégées.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link to={ROUTE_PATHS.home}>Accueil</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to={ROUTE_PATHS.auth}>Se connecter</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/aide">Aide</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
