import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
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
  Ticket,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import {
  useFleetMembers,
  useAddFleetMember,
  useUpdateMemberRole,
  useRemoveFleetMember,
  type FleetMember,
  type AddMemberData,
} from "@/hooks/useFleetMembers";
import { useSearchUsers, type SearchedUser } from "@/hooks/useSearchUsers";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { canManageRole } from "@/lib/rbac/permissions";
import { FLEET_ROLE_LABELS, type FleetRole } from "@/types/role";
import type { PlatformRole } from "@/types/rbac";
import type { RoleType } from "@/repositories/fleet-member.repository";
import { useActivation } from "@/hooks/useActivation";
import { isValidCameroonMobileInput, normalizeCameroonPhoneE164 } from "@/lib/cameroonPhone";
import {
  addMemberSchema,
  isActiveFleetMember,
  type AddMemberFormValues,
} from "@/features/teams/components/fleetTeamManagement.constants";

export type FleetTeamManagementPanelProps = {
  layout: "page" | "embedded";
  /** Identifiant de l’utilisateur connecté (traçabilité / audit futur). */
  currentUserId?: string | null;
  className?: string;
};

/**
 * Gestion des membres de flotte (liste, rôles, invitations) — partagée entre la page Équipes et Paramètres.
 * Les autorisations d’action reposent sur {@link usePermissions} (backoffice), pas sur un rôle fictif.
 */
export function FleetTeamManagementPanel({
  layout,
  currentUserId,
  className,
}: FleetTeamManagementPanelProps) {
  const { user, userFleetId, activeTenantContext } = useAuth();
  const { canAccessBackoffice } = usePermissions();
  const { can } = useRoleAccess();
  const navigate = useNavigate();
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<{
    membershipId: string;
    userId: string;
    role: FleetMember["role"];
    displayName: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    data: members = [],
    isLoading: isLoadingMembers,
    isError: isMembersError,
    error: membersError,
    refetch: refetchMembers,
  } = useFleetMembers(userFleetId || undefined);
  const addMemberMutation = useAddFleetMember();
  const updateRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveFleetMember();
  const { completeStep } = useActivation();

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
      phone: "",
    },
  });

  useEffect(() => {
    if (isAddMemberDialogOpen) {
      setSearchTerm("");
      setIsSearchOpen(false);
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form.reset stable, reset uniquement à l’ouverture
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
      const trimmedPhone = data.phone?.trim();
      const normalizedPhone =
        trimmedPhone && isValidCameroonMobileInput(trimmedPhone)
          ? normalizeCameroonPhoneE164(trimmedPhone)
          : undefined;
      const payload: AddMemberData = { email: data.email, role: data.role, phone: normalizedPhone };
      await addMemberMutation.mutateAsync({
        fleetId: userFleetId,
        data: payload,
      });
      await completeStep("invite_member");
      form.reset();
      setSearchTerm("");
      setIsSearchOpen(false);
      setIsAddMemberDialogOpen(false);
    } catch {
      // Erreur déjà gérée dans le hook
    }
  };

  const handleSelectUser = (searched: SearchedUser) => {
    form.setValue("email", searched.email, { shouldValidate: true });
    // Pré-remplit le téléphone si disponible dans le profil de l'utilisateur trouvé
    if (searched.phone) {
      form.setValue("phone", searched.phone, { shouldValidate: false });
    }
    setSearchTerm(searched.full_name || searched.email);
    setIsSearchOpen(false);
  };

  const activeMembers = members.filter((member) => member.is_active);
  const inactiveCount = members.length - activeMembers.length;
  const displayedMembers = showInactive ? members : activeMembers;

  const isUserAlreadyMember = (_email: string, searchedUserId?: string) => {
    if (!searchedUserId) return false;
    return isActiveFleetMember(members, searchedUserId);
  };

  const handleUpdateRole = async (
    member: FleetMember,
    newRole: "organizer" | "manager" | "driver" | "mechanic",
  ) => {
    if (!userFleetId) return;

    try {
      await updateRoleMutation.mutateAsync({
        membershipId: member.id,
        fleetId: userFleetId,
        userId: member.user_id,
        role: newRole,
      });
    } catch {
      // Erreur déjà gérée dans le hook
    }
  };

  const handleRemoveMember = (
    membershipId: string,
    userId: string,
    role: FleetMember["role"],
    displayName?: string,
  ) => {
    if (!userFleetId) return;
    setRemoveConfirm({
      membershipId,
      userId,
      role,
      displayName: displayName ?? "ce membre",
    });
  };

  const handleConfirmRemoveMember = async () => {
    if (!userFleetId || !removeConfirm) return;
    try {
      await removeMemberMutation.mutateAsync({
        membershipId: removeConfirm.membershipId,
        fleetId: userFleetId,
        userId: removeConfirm.userId,
        role: removeConfirm.role,
      });
      setRemoveConfirm(null);
    } catch {
      // Erreur déjà gérée dans le hook
    }
  };

  const getRoleIcon = (memberRole: string) => {
    switch (memberRole) {
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

  const getRoleLabel = (memberRole: string) =>
    FLEET_ROLE_LABELS[memberRole as FleetRole] ?? memberRole;

  const getRoleBadgeVariant = (memberRole: string) => {
    switch (memberRole) {
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

  const canManageTeam = canAccessBackoffice && can("member.invite");
  const canUpdateRoles = can("member.update_role");
  const canRemoveMembers = can("member.remove");

  const callerRole = (activeTenantContext?.role ?? null) as PlatformRole | null;
  const invitableRoles: RoleType[] = (["organizer", "manager", "driver", "mechanic"] as const).filter(
    (role) => canManageRole(callerRole, role),
  );
  const isPage = layout === "page";

  if (!userFleetId) {
    if (isPage) {
      return null;
    }
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="text-muted-foreground mb-4 h-16 w-16" />
            <h3 className="mb-2 text-lg font-semibold">Aucune flotte trouvée</h3>
            <p className="text-muted-foreground mb-4">
              Créez une flotte pour gérer votre équipe ou rejoignez-en une via un code d&apos;invitation.
            </p>
            <Button type="button" onClick={() => navigate("/dashboard/create-fleet")}>
              Créer une flotte
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rootClass = cn(
    isPage ? "mx-auto max-w-7xl space-y-6" : "w-full space-y-6",
    className,
  );

  return (
    <div
      className={rootClass}
      data-actor-user-id={currentUserId ?? undefined}
      data-layout={layout}
    >
      {isPage && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading flex items-center gap-2 text-2xl font-bold md:text-3xl">
              <Users className="h-7 w-7" />
              Gestion des équipes
            </h1>
            <p className="text-muted-foreground mt-1">Gérez les membres et les rôles de votre flotte</p>
          </div>
          {canManageTeam && (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/dashboard/invitations">
                  <Ticket className="mr-2 h-4 w-4" />
                  Créer une invitation
                </Link>
              </Button>
              <Button type="button" onClick={() => setIsAddMemberDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Ajouter un membre
              </Button>
            </div>
          )}
        </div>
      )}

      {!isPage && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold">Gestion des équipes</h2>
            <p className="text-muted-foreground text-sm">Membres et rôles de la flotte active</p>
          </div>
          {canManageTeam && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/invitations">
                  <Ticket className="mr-2 h-4 w-4" />
                  Invitations
                </Link>
              </Button>
              <Button type="button" size="sm" onClick={() => setIsAddMemberDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Ajouter un membre
              </Button>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Membres de l&apos;équipe</CardTitle>
              <CardDescription>
                {activeMembers.length} actif{activeMembers.length !== 1 ? "s" : ""}
                {inactiveCount > 0 &&
                  ` · ${inactiveCount} inactif${inactiveCount !== 1 ? "s" : ""}`}
                {" "}dans votre flotte
              </CardDescription>
            </div>
            {inactiveCount > 0 && (
              <div className="flex items-center gap-2">
                <Switch
                  id="teams-show-inactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                  className="scale-90"
                />
                <Label htmlFor="teams-show-inactive" className="cursor-pointer text-sm">
                  Afficher inactifs
                </Label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingMembers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : isMembersError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <XCircle className="text-destructive mb-4 h-16 w-16" />
              <h3 className="mb-2 text-lg font-semibold">Erreur de chargement</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                {typeof membersError?.message === "string"
                  ? membersError.message
                  : "Impossible de charger les membres de l'équipe."}
              </p>
              <Button variant="outline" type="button" onClick={() => void refetchMembers()}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
            </div>
          ) : displayedMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="text-muted-foreground mb-4 h-16 w-16" />
              <h3 className="mb-2 text-lg font-semibold">
                {members.length > 0 ? "Aucun membre actif" : "Aucun membre"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {members.length > 0
                  ? "Activez « Afficher inactifs » pour voir les membres retirés, ou ajoutez de nouveaux membres."
                  : "Commencez par ajouter des membres à votre équipe ou invitez-les par code."}
              </p>
              {canManageTeam && (
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="outline" asChild>
                    <Link to="/dashboard/invitations">
                      <Ticket className="mr-2 h-4 w-4" />
                      Créer une invitation
                    </Link>
                  </Button>
                  <Button type="button" onClick={() => setIsAddMemberDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Ajouter le premier membre
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-card flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex flex-1 items-center gap-4">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                      {getRoleIcon(member.role)}
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-medium">
                          {member.profile?.full_name || "Utilisateur sans nom"}
                        </span>
                        <Badge variant={getRoleBadgeVariant(member.role)}>{getRoleLabel(member.role)}</Badge>
                        {!member.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactif
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
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
                  {(canUpdateRoles || canRemoveMembers) && member.user_id !== user?.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          aria-label={`Actions pour ${member.profile?.full_name || "utilisateur sans nom"}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canUpdateRoles && (
                          <>
                        <DropdownMenuItem
                          type="button"
                          onClick={() => void handleUpdateRole(member, "organizer")}
                          disabled={member.role === "organizer"}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Définir comme Organisateur
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          type="button"
                          onClick={() => void handleUpdateRole(member, "manager")}
                          disabled={member.role === "manager"}
                        >
                          <UserCog className="mr-2 h-4 w-4" />
                          Définir comme {FLEET_ROLE_LABELS.manager}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          type="button"
                          onClick={() => void handleUpdateRole(member, "driver")}
                          disabled={member.role === "driver"}
                        >
                          <Car className="mr-2 h-4 w-4" />
                          Définir comme Chauffeur
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          type="button"
                          onClick={() => void handleUpdateRole(member, "mechanic")}
                          disabled={member.role === "mechanic"}
                        >
                          <Wrench className="mr-2 h-4 w-4" />
                          Définir comme Mécanicien
                        </DropdownMenuItem>
                          </>
                        )}
                        {canRemoveMembers && (
                        <DropdownMenuItem
                          type="button"
                          onClick={() =>
                            handleRemoveMember(
                              member.id,
                              member.user_id,
                              member.role,
                              member.profile?.full_name ?? undefined,
                            )
                          }
                          className="text-destructive"
                        >
                          Retirer de l&apos;équipe
                        </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
            <div className="bg-card space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Shield className="text-primary h-5 w-5" />
                <h3 className="font-semibold">Organisateur</h3>
              </div>
              <p className="text-muted-foreground text-sm">Accès complet à toutes les fonctionnalités</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Gérer l&apos;équipe</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Gérer les véhicules</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Créer des invitations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Valider les clôtures</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Gérer la maintenance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Voir tous les rapports</span>
                </div>
              </div>
            </div>

            <div className="bg-card space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <UserCog className="text-info h-5 w-5" />
                <h3 className="font-semibold">{FLEET_ROLE_LABELS.manager}</h3>
              </div>
              <p className="text-muted-foreground text-sm">Gestion opérationnelle de la flotte</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Gérer l&apos;équipe</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Gérer les véhicules</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Créer des invitations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Valider les clôtures</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Gérer la maintenance</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">Modifier les paramètres</span>
                </div>
              </div>
            </div>

            <div className="bg-card space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold">Chauffeur</h3>
              </div>
              <p className="text-muted-foreground text-sm">Conduite et gestion des courses</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Conduire les véhicules assignés</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Créer des incidents</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Clôturer les journées</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Voir ses statistiques</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">Gérer l&apos;équipe</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">Gérer les véhicules</span>
                </div>
              </div>
            </div>

            <div className="bg-card space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">Mécanicien</h3>
              </div>
              <p className="text-muted-foreground text-sm">Maintenance et réparations</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Créer des jobs de maintenance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Valider les interventions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Voir les véhicules</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-success h-4 w-4" />
                  <span>Consulter les incidents</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">Gérer l&apos;équipe</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground">Assigner des véhicules</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Ajouter un membre à l&apos;équipe
            </DialogTitle>
            <DialogDescription>
              Recherchez un utilisateur par email ou nom, ou saisissez directement un email pour l&apos;ajouter à
              votre flotte.
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
                      <PopoverAnchor asChild>
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

                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                if (emailRegex.test(value)) {
                                  field.onChange(value);
                                  setIsSearchOpen(false);
                                } else {
                                  setIsSearchOpen(value.length >= 2);
                                  if (value.length < 2) {
                                    field.onChange("");
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                if (emailRegex.test(e.target.value)) {
                                  field.onChange(e.target.value);
                                }
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
                              <Loader2 className="text-muted-foreground absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
                            )}
                            {!isSearching && searchTerm.length >= 2 && (
                              <Search className="text-muted-foreground absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                            )}
                          </div>
                        </FormControl>
                      </PopoverAnchor>
                      <PopoverContent className="w-[400px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                                    searchedUser.user_id,
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
                                      className={cn(isAlreadyMember && "cursor-not-allowed opacity-50")}
                                    >
                                      <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <div className="bg-primary/10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                                          <Mail className="text-primary h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <p className="truncate font-medium">
                                              {searchedUser.full_name || "Sans nom"}
                                            </p>
                                            {field.value === searchedUser.email && (
                                              <Check className="text-primary h-4 w-4" />
                                            )}
                                          </div>
                                          <p className="text-muted-foreground truncate text-sm">
                                            {searchedUser.email}
                                          </p>
                                          {searchedUser.phone && (
                                            <p className="text-muted-foreground flex items-center gap-1 text-xs">
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
                        Tapez au moins 2 caractères pour rechercher un utilisateur par email ou nom. Vous pouvez aussi
                        saisir directement un email valide.
                      </FormDescription>
                      {field.value && (
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
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
                        {invitableRoles.includes("organizer") && (
                          <SelectItem value="organizer">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                <span className="font-medium">Organisateur</span>
                              </div>
                              <span className="text-muted-foreground ml-6 text-xs">
                                Accès complet à toutes les fonctionnalités
                              </span>
                            </div>
                          </SelectItem>
                        )}
                        {invitableRoles.includes("manager") && (
                          <SelectItem value="manager">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <UserCog className="h-4 w-4" />
                                <span className="font-medium">{FLEET_ROLE_LABELS.manager}</span>
                              </div>
                              <span className="text-muted-foreground ml-6 text-xs">
                                Gestion opérationnelle de la flotte
                              </span>
                            </div>
                          </SelectItem>
                        )}
                        {invitableRoles.includes("driver") && (
                          <SelectItem value="driver">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4" />
                                <span className="font-medium">Chauffeur</span>
                              </div>
                              <span className="text-muted-foreground ml-6 text-xs">
                                Conduite et gestion des courses
                              </span>
                            </div>
                          </SelectItem>
                        )}
                        {invitableRoles.includes("mechanic") && (
                          <SelectItem value="mechanic">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                <span className="font-medium">Mécanicien</span>
                              </div>
                              <span className="text-muted-foreground ml-6 text-xs">
                                Maintenance et réparations
                              </span>
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Mobile Cameroun{" "}
                      <span className="text-muted-foreground font-normal">(optionnel)</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                        <Input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="6XX XXX XXX ou +237…"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Pour les chauffeurs, renseigner le numéro évite le blocage à la première
                      connexion.
                    </FormDescription>
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
                <Button type="submit" className="flex-1" disabled={addMemberMutation.isPending}>
                  {addMemberMutation.isPending ? "Ajout..." : "Ajouter le membre"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeConfirm} onOpenChange={(open) => !open && setRemoveConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Retirer de l&apos;équipe</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir retirer {removeConfirm?.displayName ?? "ce membre"} de l&apos;équipe ?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setRemoveConfirm(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              type="button"
              disabled={removeMemberMutation.isPending}
              onClick={() => void handleConfirmRemoveMember()}
            >
              {removeMemberMutation.isPending ? "Retrait..." : "Retirer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
