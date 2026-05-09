import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { LogIn } from "lucide-react";

/**
 * Écran d’information côté « espace authentifié » (ex. lien profond sans session).
 * Les flux réels passent par `/auth` avec Supabase.
 */
export default function AuthLandingScreen() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" aria-hidden />
            Connexion Flotte E-Samba
          </CardTitle>
          <CardDescription>
            Accédez à votre espace sécurisé pour piloter la flotte et les alertes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" asChild>
            <Link to={ROUTE_PATHS.auth}>Aller à la connexion</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
