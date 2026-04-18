import { useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { FleetTeamManagementPanel } from "@/features/teams/components";

/**
 * Page Équipes — redirection si pas de flotte / pas de droit backoffice ; sinon panneau partagé avec Paramètres.
 */
const Teams = () => {
  const { user, role, userFleetId, isLoading: authLoading } = useAuth();
  const { canAccessBackoffice } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userFleetId && role === null) {
      navigate("/dashboard/create-fleet");
    }
  }, [userFleetId, role, navigate]);

  if (authLoading) {
    return <PageLoader />;
  }

  if (!canAccessBackoffice) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!userFleetId) {
    if (role === null) {
      return <PageLoader />;
    }
    return (
      <div className="mx-auto max-w-7xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="text-muted-foreground mb-4 h-16 w-16" />
            <h3 className="mb-2 text-lg font-semibold">Aucune flotte trouvée</h3>
            <p className="text-muted-foreground mb-4">
              Vous devez être membre d&apos;une flotte pour gérer une équipe. Créez une flotte ou rejoignez-en une via un
              code d&apos;invitation.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" type="button" onClick={() => navigate("/dashboard")}>
                Tableau de bord
              </Button>
              <Button type="button" onClick={() => navigate("/dashboard/create-fleet")}>
                Créer une flotte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <FleetTeamManagementPanel layout="page" currentUserId={user?.id ?? null} />;
};

export default Teams;
