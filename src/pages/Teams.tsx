import { useState, useEffect, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Users,
  UserPlus,
  Shield,
  UserCog,
  Car,
  Wrench,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  Info,
  CheckCircle2,
  XCircle,
  Search,
  Loader2,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFleetMembers, useAddFleetMember, useUpdateMemberRole, useRemoveFleetMember, type FleetMember, type AddMemberData } from "@/hooks/useFleetMembers";
import { useSearchUsers, type SearchedUser } from "@/hooks/useSearchUsers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const addMemberSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["organizer", "manager", "driver", "mechanic"]),
});

type AddMemberFormValues = z.infer<typeof addMemberSchema>;

const Teams = () => {
  const { user, role, userFleetId, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<{ membershipId: string; displayName: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Utiliser "organizer" comme fallback uniquement pour l'affichage de la sidebar
  // Le rôle réel reste null si aucun membership n'existe
  const userRole = role || "organizer";

  // Récupérer les membres de la flotte
  const { data: members = [], isLoading: isLoadingMembers } = useFleetMembers(userFleetId || undefined);
  const addMemberMutation = useAddFleetMember();
  const updateRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveFleetMember();

  // Recherche d'utilisateurs
  const { data: searchedUsers = [], isLoading: isSearching } = useSearchUsers({
    searchTerm,
    limit: 10,
    enabled: isSearchOpen && searchTerm.length >= 2,
  });

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      email: "",
      role: "driver",
    },
  });

  // Réinitialiser la recherche et le formulaire à l'ouverture du dialog
  useEffect(() => {
    if (isAddMemberDialogOpen) {
      setSearchTerm("");
      setIsSearchOpen(false);
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form.reset stable, reset uniquement à l'ouverture
  }, [isAddMemberDialogOpen]);

  const onSubmit = async (data: AddMemberFormValues) => {
    if (!userFleetId) {
      toast({
        title: "Erreur",
        description: "Aucune flotte trouvée.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload: AddMemberData = { email: data.email, role: data.role };
      await addMemberMutation.mutateAsync({
        fleetId: userFleetId,
        data: payload,
      });
      form.reset();
      setSearchTerm("");
      setIsSearchOpen(false);
      setIsAddMemberDialogOpen(false);
    } catch (error) {
      // L'erreur est déjà gérée dans le hook
    }
  };

  // Sélectionner un utilisateur depuis les résultats de recherche
  const handleSelectUser = (user: SearchedUser) => {
    form.setValue("email", user.email, { shouldValidate: true });
    setSearchTerm(user.full_name || user.email);
    setIsSearchOpen(false);
  };

  // Vérifier si un utilisateur est déjà membre (par user_id ; les emails ne sont pas exposés côté liste)
  const isUserAlreadyMember = (_email: string, userId?: string) => {
    if (!userId) return false;
    return members.some((member) => member.user_id === userId);
  };

  const handleUpdateRole = async (member: FleetMember, newRole: "organizer" | "manager" | "driver" | "mechanic") => {
    if (!userFleetId) return;

    try {
      await updateRoleMutation.mutateAsync({
        membershipId: member.id,
        fleetId: userFleetId,
        userId: member.user_id,
        role: newRole,
      });
    } catch (error) {
      // L'erreur est déjà gérée dans le hook
    }
  };

  const handleRemoveMember = (membershipId: string, displayName?: string) => {
    if (!userFleetId) return;
    setRemoveConfirm({ membershipId, displayName: displayName ?? "ce membre" });
  };

  const handleConfirmRemoveMember = async () => {
    if (!userFleetId || !removeConfirm) return;
    try {
      await removeMemberMutation.mutateAsync({
        membershipId: removeConfirm.membershipId,
        fleetId: userFleetId,
      });
      setRemoveConfirm(null);
    } catch (error) {
      // L'erreur est déjà gérée dans le hook
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "organizer":
        return <Shield className="h-4 w-4" />;
      case "manager":
        return <UserCog className="h-4 w-4" />;
      case "driver":
        return <Car className="h-4 w-4" />;
      case "mechanic":
        return <Wrench className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "organizer":
        return "Organisateur";
      case "manager":
        return "Manager";
      case "driver":
        return "Chauffeur";
      case "mechanic":
        return "Mécanicien";
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "organizer":
        return "default";
      case "manager":
        return "secondary";
      case "driver":
        return "outline";
      case "mechanic":
        return "outline";
      default:
        return "outline";
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Seuls organizer et manager peuvent accéder à la page Équipes (aligné avec Invitations)
  const canManageTeam = role === "organizer" || role === "manager";
  if (!canManageTeam) {
    return <Navigate to="/dashboard" replace />;
  }

  // Rediriger automatiquement vers la création de flotte si pas de flotte ni de rôle
  useEffect(() => {
    if (!userFleetId && role === null) {
      navigate("/dashboard/create-fleet");
    }
  }, [userFleetId, role, navigate]);

  // Sans flotte : afficher la carte uniquement si role !== null (sinon redirection en cours)
  if (!userFleetId) {
    if (role === null) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <DashboardSidebar userRole={userRole} />
          <SidebarInset className="flex flex-col flex-1">
            <DashboardHeader userRole={userRole} />
            <main className="flex-1 p-6 overflow-auto">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune flotte trouvée</h3>
                  <p className="text-muted-foreground mb-4">
                    Vous devez être membre d'une flotte pour gérer une équipe. Rejoignez-en une via un code d'invitation.
                  </p>
                  {/* Page Invitations = création de codes (organizer/manager). Pour rejoindre une flotte : utiliser un code lors de l'inscription (Auth). */}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate("/dashboard")}>
                      Aller au tableau de bord
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar userRole={userRole} />
        <SidebarInset className="flex flex-col flex-1">
          <DashboardHeader userRole={userRole} />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
                    <Users className="h-7 w-7" />
                    Gestion des équipes
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Gérez les membres et les rôles de votre flotte
                  </p>
                </div>
                {canManageTeam && (
                  <Button onClick={() => setIsAddMemberDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Ajouter un membre
                  </Button>
                )}
              </div>

              {/* Liste des membres */}
              <Card>
                <CardHeader>
                  <CardTitle>Membres de l'équipe</CardTitle>
                  <CardDescription>
                    {members.length} membre{members.length > 1 ? "s" : ""} dans votre flotte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingMembers ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : members.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="w-16 h-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Aucun membre</h3>
                      <p className="text-muted-foreground mb-4">
                        Commencez par ajouter des membres à votre équipe.
                      </p>
                      {canManageTeam && (
                        <Button onClick={() => setIsAddMemberDialogOpen(true)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Ajouter le premier membre
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              {getRoleIcon(member.role)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">
                                  {member.profile?.full_name || "Utilisateur sans nom"}
                                </span>
                                <Badge variant={getRoleBadgeVariant(member.role)}>
                                  {getRoleLabel(member.role)}
                                </Badge>
                                {!member.is_active && (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Inactif
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {member.profile?.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {member.profile.phone}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Ajouté le {new Date(member.created_at).toLocaleDateString("fr-FR")}
                                </div>
                              </div>
                            </div>
                          </div>
                          {canManageTeam && member.user_id !== user?.id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleUpdateRole(member, "organizer")}
                                  disabled={member.role === "organizer"}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Définir comme Organisateur
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleUpdateRole(member, "manager")}
                                  disabled={member.role === "manager"}
                                >
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Définir comme Manager
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleUpdateRole(member, "driver")}
                                  disabled={member.role === "driver"}
                                >
                                  <Car className="h-4 w-4 mr-2" />
                                  Définir comme Chauffeur
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleUpdateRole(member, "mechanic")}
                                  disabled={member.role === "mechanic"}
                                >
                                  <Wrench className="h-4 w-4 mr-2" />
                                  Définir comme Mécanicien
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRemoveMember(member.id, member.profile?.full_name ?? undefined)}
                                  className="text-destructive"
                                >
                                  Retirer de l'équipe
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Section des autorisations par rôle */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Autorisations par rôle
                  </CardTitle>
                  <CardDescription>
                    Découvrez les permissions associées à chaque rôle dans la flotte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Organisateur */}
                    <div className="space-y-3 p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Organisateur</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Accès complet à toutes les fonctionnalités
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Gérer l'équipe</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Gérer les véhicules</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Créer des invitations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Valider les clôtures</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Gérer la maintenance</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Voir tous les rapports</span>
                        </div>
                      </div>
                    </div>

                    {/* Manager */}
                    <div className="space-y-3 p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-info" />
                        <h3 className="font-semibold">Manager</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Gestion opérationnelle de la flotte
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Gérer l'équipe</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Gérer les véhicules</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Créer des invitations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Valider les clôtures</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Gérer la maintenance</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Modifier les paramètres</span>
                        </div>
                      </div>
                    </div>

                    {/* Chauffeur */}
                    <div className="space-y-3 p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <Car className="h-5 w-5 text-orange-500" />
                        <h3 className="font-semibold">Chauffeur</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Conduite et gestion des courses
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Conduire les véhicules assignés</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Créer des incidents</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Clôturer les journées</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Voir ses statistiques</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Gérer l'équipe</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Gérer les véhicules</span>
                        </div>
                      </div>
                    </div>

                    {/* Mécanicien */}
                    <div className="space-y-3 p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-purple-500" />
                        <h3 className="font-semibold">Mécanicien</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Maintenance et réparations
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Créer des jobs de maintenance</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Valider les interventions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Voir les véhicules</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>Consulter les incidents</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Gérer l'équipe</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Assigner des véhicules</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Dialog pour ajouter un membre */}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Ajouter un membre à l'équipe
            </DialogTitle>
            <DialogDescription>
              Recherchez un utilisateur par email ou nom, ou saisissez directement un email pour l'ajouter à votre flotte.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Rechercher un membre</FormLabel>
                    <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <div className="relative">
                            <Input
                              ref={searchInputRef}
                              type="text"
                              placeholder="Rechercher par email ou nom..."
                              value={searchTerm}
                              onChange={(e) => {
                                const value = e.target.value;
                                setSearchTerm(value);
                                
                                // Détecter si c'est un email valide
                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                if (emailRegex.test(value)) {
                                  field.onChange(value);
                                  setIsSearchOpen(false);
                                } else {
                                  setIsSearchOpen(value.length >= 2);
                                  // Si ce n'est pas un email valide et qu'on a moins de 2 caractères, réinitialiser
                                  if (value.length < 2) {
                                    field.onChange("");
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                // Vérifier si la valeur finale est un email valide
                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                if (emailRegex.test(e.target.value)) {
                                  field.onChange(e.target.value);
                                }
                                // Fermer le popover après un court délai pour permettre le clic sur un résultat
                                setTimeout(() => setIsSearchOpen(false), 200);
                              }}
                              onFocus={() => {
                                if (searchTerm.length >= 2) {
                                  setIsSearchOpen(true);
                                }
                              }}
                              className="pr-10"
                            />
                            {isSearching && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            {!isSearching && searchTerm.length >= 2 && (
                              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Rechercher un utilisateur..."
                            value={searchTerm}
                            onValueChange={(value) => {
                              setSearchTerm(value);
                              setIsSearchOpen(value.length >= 2);
                            }}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {searchTerm.length < 2
                                ? "Tapez au moins 2 caractères pour rechercher"
                                : "Aucun utilisateur trouvé"}
                            </CommandEmpty>
                            {searchedUsers.length > 0 && (
                              <CommandGroup heading="Résultats de recherche">
                                {searchedUsers.map((searchedUser) => {
                                  const isAlreadyMember = isUserAlreadyMember(
                                    searchedUser.email,
                                    searchedUser.user_id
                                  );
                                  return (
                                    <CommandItem
                                      key={searchedUser.user_id}
                                      value={searchedUser.email}
                                      onSelect={() => {
                                        if (!isAlreadyMember) {
                                          handleSelectUser(searchedUser);
                                        }
                                      }}
                                      disabled={isAlreadyMember}
                                      className={cn(
                                        isAlreadyMember && "opacity-50 cursor-not-allowed"
                                      )}
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                          <Mail className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="font-medium truncate">
                                              {searchedUser.full_name || "Sans nom"}
                                            </p>
                                            {field.value === searchedUser.email && (
                                              <Check className="h-4 w-4 text-primary" />
                                            )}
                                          </div>
                                          <p className="text-sm text-muted-foreground truncate">
                                            {searchedUser.email}
                                          </p>
                                          {searchedUser.phone && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                              <Phone className="h-3 w-3" />
                                              {searchedUser.phone}
                                            </p>
                                          )}
                                        </div>
                                        {isAlreadyMember && (
                                          <Badge variant="outline" className="ml-auto flex-shrink-0">
                                            Déjà membre
                                          </Badge>
                                        )}
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <div className="space-y-1">
                      <FormDescription>
                        Tapez au moins 2 caractères pour rechercher un utilisateur par email ou nom.
                        Vous pouvez aussi saisir directement un email valide.
                      </FormDescription>
                      {field.value && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>Email sélectionné : {field.value}</span>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="organizer">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <span className="font-medium">Organisateur</span>
                            </div>
                            <span className="text-xs text-muted-foreground ml-6">
                              Accès complet à toutes les fonctionnalités
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="manager">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <UserCog className="h-4 w-4" />
                              <span className="font-medium">Manager</span>
                            </div>
                            <span className="text-xs text-muted-foreground ml-6">
                              Gestion opérationnelle de la flotte
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="driver">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4" />
                              <span className="font-medium">Chauffeur</span>
                            </div>
                            <span className="text-xs text-muted-foreground ml-6">
                              Conduite et gestion des courses
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="mechanic">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              <span className="font-medium">Mécanicien</span>
                            </div>
                            <span className="text-xs text-muted-foreground ml-6">
                              Maintenance et réparations
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAddMemberDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={addMemberMutation.isPending}
                >
                  {addMemberMutation.isPending ? "Ajout..." : "Ajouter le membre"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation retrait d'un membre */}
      <Dialog open={!!removeConfirm} onOpenChange={(open) => !open && setRemoveConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Retirer de l'équipe</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir retirer {removeConfirm?.displayName ?? "ce membre"} de l'équipe ?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setRemoveConfirm(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={removeMemberMutation.isPending}
              onClick={handleConfirmRemoveMember}
            >
              {removeMemberMutation.isPending ? "Retrait..." : "Retirer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Teams;
