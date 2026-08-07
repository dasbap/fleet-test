import { useEffect, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { CreateInvitationDialog } from "@/components/invitations/CreateInvitationDialog";
import { Plus, ShieldCheck, UserPlus, UsersRound } from "lucide-react";

const Invitations = () => {
  const navigate = useNavigate();
  const { role, userFleetId, isLoading: authLoading } = useAuth();
  const { canAccessBackoffice } = usePermissions();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UserPlus className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune flotte trouvée</h3>
            <p className="text-muted-foreground mb-4">
              Vous devez avoir une flotte active pour créer des comptes membres.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Tableau de bord
              </Button>
              <Button onClick={() => navigate("/dashboard/create-fleet")}>
                Créer une flotte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">
              Comptes de flotte
            </h1>
            <p className="text-muted-foreground mt-1">
              Créez des comptes membres directement sous votre flotte.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button variant="outline" className="w-full" asChild>
              <Link to="/dashboard/teams">
                <UsersRound className="w-4 h-4 mr-2" />
                Voir l'équipe
              </Link>
            </Button>
            <Button className="w-full" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un compte
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Création directe
            </CardTitle>
            <CardDescription>
              Aucun lien ni code d'invitation n'est généré pour les nouveaux membres.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium">Compte utilisateur</p>
              <p className="mt-1 text-sm text-muted-foreground">
                L'adresse email devient l'identifiant de connexion.
              </p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium">Flotte active</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Le membre est rattaché à la flotte de l'organisateur.
              </p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium">Rôle attribué</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Le rôle choisi est appliqué dès la création du compte.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateInvitationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        fleetId={userFleetId}
      />
    </>
  );
};

export default Invitations;
