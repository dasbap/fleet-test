import { useState, useEffect } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ticket, Plus, Copy, Check, MoreVertical, Trash2, Calendar, Users, Loader2, UsersRound } from "lucide-react";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useInvitations, useDeleteInvitation } from "@/hooks/useInvitations";
import { CreateInvitationDialog } from "@/components/invitations/CreateInvitationDialog";
import { useToast } from "@/hooks/use-toast";

const Invitations = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, role, userFleetId, isLoading: authLoading } = useAuth();
  const { canAccessBackoffice } = usePermissions();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: invitations = [], isLoading, refetch } = useInvitations(userFleetId || undefined);
  const deleteInvitation = useDeleteInvitation();

  const canManageInvitations = canAccessBackoffice;

  // L'authentification est gérée par ProtectedRoute. Redirection des rôles non autorisés via Navigate ci-dessous.

  // Rediriger vers la création de flotte si pas de flotte ni de rôle.
  // Important : ce useEffect doit être appelé de manière inconditionnelle (pas après un early return).
  useEffect(() => {
    if (!userFleetId && role === null) {
      navigate("/dashboard/create-fleet");
    }
  }, [userFleetId, role, navigate]);

  const copyToClipboard = async (code: string) => {
    if (!navigator.clipboard) {
      toast({
        title: "Fonction non supportée",
        description: "La copie dans le presse-papiers n'est pas supportée par ce navigateur.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: "Code copié",
        description: "Le code d'invitation a été copié dans le presse-papiers.",
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!invitationToDelete || !userFleetId) return;

    try {
      await deleteInvitation.mutateAsync({
        invitationId: invitationToDelete,
        fleetId: userFleetId,
      });

      toast({
        title: "Invitation supprimée",
        description: "L'invitation a été supprimée avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'invitation. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setInvitationToDelete(null);
    }
  };

  const getInvitationStatus = (invitation: {
    expires_at: string | null;
    max_uses: number | null;
    current_uses: number;
  }) => {
    const now = new Date();
    const expiresAt = invitation.expires_at ? new Date(invitation.expires_at) : null;

    if (expiresAt && expiresAt < now) {
      return { label: "Expirée", variant: "destructive" as const };
    }

    if (invitation.max_uses && invitation.current_uses >= invitation.max_uses) {
      return { label: "Limite atteinte", variant: "secondary" as const };
    }

    return { label: "Active", variant: "default" as const };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Jamais";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (authLoading || isLoading) {
    return <PageLoader />;
  }

  if (!canManageInvitations) {
    return <Navigate to="/dashboard" replace />;
  }

  // Sans flotte : afficher la carte dédiée si role défini (sinon redirection en cours)
  if (!userFleetId) {
    if (role === null) {
      return <PageLoader />;
    }
    return (
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Ticket className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune flotte trouvée</h3>
            <p className="text-muted-foreground mb-4">
              Vous devez être membre d'une flotte pour gérer les invitations. Créez une flotte ou rejoignez-en une via un code d'invitation.
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
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold">
                    Gestion des invitations
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Créez et gérez les codes d'invitation pour votre flotte
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/dashboard/teams">
                      <UsersRound className="w-4 h-4 mr-2" />
                      Voir l'équipe
                    </Link>
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer une invitation
                  </Button>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total d'invitations</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{invitations.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {invitations.filter((i) => getInvitationStatus(i).label === "Active").length} active(s)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Utilisations totales</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {invitations.reduce((sum, inv) => sum + inv.current_uses, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Utilisations cumulées
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Invitations expirées</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {invitations.filter((i) => {
                        const expiresAt = i.expires_at ? new Date(i.expires_at) : null;
                        return expiresAt && expiresAt < new Date();
                      }).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      À supprimer
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Invitations Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Liste des invitations</CardTitle>
                  <CardDescription>
                    Toutes les invitations créées pour votre flotte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invitations.length === 0 ? (
                    <div className="text-center py-12">
                      <Ticket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Aucune invitation</h3>
                      <p className="text-muted-foreground mb-4">
                        Créez votre première invitation pour inviter des chauffeurs à rejoindre votre flotte.
                      </p>
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Créer une invitation
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Utilisations</TableHead>
                          <TableHead>Expiration</TableHead>
                          <TableHead>Créée le</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invitation) => {
                          const status = getInvitationStatus(invitation);
                          return (
                            <TableRow key={invitation.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <code className="font-mono font-semibold text-sm bg-muted px-2 py-1 rounded">
                                    {invitation.code}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyToClipboard(invitation.code)}
                                  >
                                    {copiedCode === invitation.code ? (
                                      <Check className="h-3 w-3 text-success" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={status.variant}>{status.label}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {invitation.current_uses}
                                    {invitation.max_uses && ` / ${invitation.max_uses}`}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {invitation.expires_at ? (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {formatDate(invitation.expires_at)}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Jamais</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(invitation.created_at)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => copyToClipboard(invitation.code)}
                                    >
                                      <Copy className="mr-2 h-4 w-4" />
                                      Copier le code
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setInvitationToDelete(invitation.id);
                                        setDeleteDialogOpen(true);
                                      }}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
      </div>

      {/* Create Invitation Dialog */}
      <CreateInvitationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        fleetId={userFleetId || ""}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'invitation</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette invitation ? Cette action est irréversible.
              Les utilisateurs ne pourront plus utiliser ce code pour rejoindre la flotte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setInvitationToDelete(null);
              }}
              disabled={deleteInvitation.isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteInvitation.isPending}
            >
              {deleteInvitation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Invitations;
