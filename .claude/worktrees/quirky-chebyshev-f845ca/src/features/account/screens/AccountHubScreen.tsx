import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { Settings } from "lucide-react";
import Profile from "@/pages/Profile";

/**
 * Hub Compte : profil existant + accès rapide aux paramètres (onglet mobile).
 */
export default function AccountHubScreen() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 sm:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">Compte</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Profil et accès aux réglages
          </p>
        </div>
        <Button variant="outline" asChild className="w-full shrink-0 sm:w-auto">
          <Link to={ROUTE_PATHS.dashboardSettings}>
            <Settings className="mr-2 h-4 w-4" aria-hidden />
            Paramètres
          </Link>
        </Button>
      </div>
      <Profile />
    </div>
  );
}
