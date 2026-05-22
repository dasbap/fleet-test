/**
 * RolesHubScreen — Gestion des rôles et permissions de la flotte.
 *
 * Onglets :
 *   1. Membres       — liste, rôle actif, changement de rôle, désactivation
 *   2. Permissions   — matrice lecture seule 5 rôles × domaines
 *   3. Invitations   — code invitation flotte (lecture seule pour l'instant)
 *
 * Accès : organizer ou admin uniquement (gardes en route).
 */

import { useState } from "react";
import {
  Shield, Users, Grid3X3, Link2, Check, X,
  MoreVertical, RefreshCw, UserX, UserCheck,
  ChevronDown, AlertTriangle, Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useFleetMembers, type MemberRow } from "../hooks/useFleetMembers";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_PERMISSIONS } from "@/lib/rbac/permissions";
import type { Permission, PlatformRole } from "@/types/rbac";
import type { RoleType } from "@/repositories/fleet-member.repository";

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<RoleType, string> = {
  organizer: "Organisateur",
  manager:   "Manager",
  mechanic:  "Mécanicien",
  driver:    "Conducteur",
};

const ROLE_COLORS: Record<RoleType, string> = {
  organizer: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  manager:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  mechanic:  "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  driver:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

// Permissions groupées par domaine pour la matrice
const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "Flotte",
    permissions: ["fleet.view", "fleet.create", "fleet.update", "fleet.delete"],
  },
  {
    label: "Véhicules",
    permissions: ["vehicle.view", "vehicle.create", "vehicle.update", "vehicle.delete", "vehicle.assign_driver"],
  },
  {
    label: "Membres",
    permissions: ["member.view", "member.invite", "member.remove", "member.update_role"],
  },
  {
    label: "Maintenance",
    permissions: ["maintenance.view", "maintenance.create", "maintenance.update", "maintenance.delete"],
  },
  {
    label: "Affectations",
    permissions: ["assignment.view_own", "assignment.view_all", "assignment.manage"],
  },
  {
    label: "Rapports",
    permissions: ["report.view", "report.export"],
  },
  {
    label: "Facturation",
    permissions: ["billing.view", "billing.manage"],
  },
  {
    label: "DVIR",
    permissions: ["dvir.submit", "dvir.view_all"],
  },
  {
    label: "Organisation",
    permissions: ["org.settings", "org.manage"],
  },
];

const PERMISSION_LABELS: Record<Permission, string> = {
  "fleet.view": "Voir la flotte",
  "fleet.create": "Créer une flotte",
  "fleet.update": "Modifier la flotte",
  "fleet.delete": "Supprimer la flotte",
  "vehicle.view": "Voir les véhicules",
  "vehicle.create": "Ajouter un véhicule",
  "vehicle.update": "Modifier un véhicule",
  "vehicle.delete": "Supprimer un véhicule",
  "vehicle.assign_driver": "Affecter un conducteur",
  "member.view": "Voir les membres",
  "member.invite": "Inviter un membre",
  "member.remove": "Retirer un membre",
  "member.update_role": "Changer un rôle",
  "maintenance.view": "Voir la maintenance",
  "maintenance.create": "Créer un travail",
  "maintenance.update": "Modifier un travail",
  "maintenance.delete": "Supprimer un travail",
  "assignment.view_own": "Voir ses affectations",
  "assignment.view_all": "Voir toutes les affectations",
  "assignment.manage": "Gérer les affectations",
  "report.view": "Voir les rapports",
  "report.export": "Exporter les rapports",
  "billing.view": "Voir la facturation",
  "billing.manage": "Gérer la facturation",
  "dvir.submit": "Soumettre un DVIR",
  "dvir.view_all": "Voir tous les DVIR",
  "org.settings": "Paramètres organisation",
  "org.manage": "Gérer l'organisation",
  "admin.access": "Accès admin",
  "admin.manage_users": "Gérer les utilisateurs",
  "admin.manage_all_fleets": "Gérer toutes les flottes",
};

const FLEET_ROLES: RoleType[] = ["organizer", "manager", "mechanic", "driver"];

// ─── Sous-composants ──────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: RoleType }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function MemberInitials({ name }: { name: string | null }) {
  const initials = name
    ? name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold text-muted-foreground">
      {initials}
    </div>
  );
}

// ─── Onglet Membres ───────────────────────────────────────────────────────────

function MembersTab() {
  const { user } = useAuth();
  const { can, isAtLeast } = useRoleAccess();
  const { members, isLoading, isError, refetch, changeRole, deactivateMember, reactivateMember } = useFleetMembers();
  const { toast } = useToast();

  const [showInactive, setShowInactive] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<MemberRow | null>(null);

  const canManage = can("member.update_role");
  const canRemove  = can("member.remove");

  const displayed = showInactive ? members : members.filter((m) => m.is_active);
  const activeCount   = members.filter((m) => m.is_active).length;
  const inactiveCount = members.filter((m) => !m.is_active).length;

  const handleRoleChange = async (member: MemberRow, newRole: RoleType) => {
    if (newRole === member.role) return;
    try {
      await changeRole.mutateAsync({ userId: member.user_id, newRole });
      toast({ title: "Rôle mis à jour", description: `${member.full_name ?? "Membre"} → ${ROLE_LABELS[newRole]}` });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDeactivate = async (member: MemberRow) => {
    try {
      await deactivateMember.mutateAsync({ memberId: member.id, userId: member.user_id, role: member.role });
      toast({ title: "Membre désactivé", description: `${member.full_name ?? "Membre"} n'a plus accès à la flotte.` });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
    setConfirmDeactivate(null);
  };

  const handleReactivate = async (member: MemberRow) => {
    try {
      await reactivateMember.mutateAsync({ userId: member.user_id, role: member.role });
      toast({ title: "Membre réactivé", description: `${member.full_name ?? "Membre"} a de nouveau accès.` });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Chargement des membres…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Impossible de charger les membres.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          <RefreshCw className="h-3 w-3 mr-1" /> Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre de contrôle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{activeCount} membre{activeCount !== 1 ? "s" : ""} actif{activeCount !== 1 ? "s" : ""}</span>
          {inactiveCount > 0 && (
            <>
              <span>·</span>
              <span>{inactiveCount} inactif{inactiveCount !== 1 ? "s" : ""}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {inactiveCount > 0 && (
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
                className="scale-90"
              />
              <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
                Afficher les inactifs
              </Label>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Liste des membres */}
      <div className="space-y-2">
        {displayed.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Aucun membre à afficher.
          </div>
        )}

        {displayed.map((member) => {
          const isSelf    = member.user_id === user?.id;
          const isPending = changeRole.isPending || deactivateMember.isPending || reactivateMember.isPending;

          return (
            <div
              key={member.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                member.is_active ? "bg-card" : "bg-muted/40 opacity-60"
              }`}
            >
              <MemberInitials name={member.full_name} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">
                    {member.full_name ?? "Sans nom"}
                  </span>
                  {isSelf && (
                    <span className="text-xs text-muted-foreground">(vous)</span>
                  )}
                  {!member.is_active && (
                    <span className="text-xs text-destructive font-medium">Inactif</span>
                  )}
                </div>
                {member.phone && (
                  <p className="text-xs text-muted-foreground mt-0.5">{member.phone}</p>
                )}
              </div>

              {/* Sélecteur de rôle (ou badge lecture seule) */}
              {canManage && !isSelf ? (
                <Select
                  value={member.role}
                  onValueChange={(v) => void handleRoleChange(member, v as RoleType)}
                  disabled={isPending || !member.is_active}
                >
                  <SelectTrigger className="w-36 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FLEET_ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <RoleBadge role={member.role} />
              )}

              {/* Menu actions */}
              {(canRemove || canManage) && !isSelf && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" disabled={isPending}>
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {member.is_active ? (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmDeactivate(member)}
                      >
                        <UserX className="h-3.5 w-3.5 mr-2" />
                        Désactiver l'accès
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => void handleReactivate(member)}>
                        <UserCheck className="h-3.5 w-3.5 mr-2" />
                        Réactiver l'accès
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      {/* Dialog confirmation désactivation */}
      <AlertDialog open={!!confirmDeactivate} onOpenChange={() => setConfirmDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver l'accès ?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeactivate?.full_name ?? "Ce membre"} perdra immédiatement l'accès à la flotte.
              Vous pourrez le réactiver à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeactivate && void handleDeactivate(confirmDeactivate)}
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Onglet Matrice des permissions ───────────────────────────────────────────

function PermissionsTab() {
  const roles: RoleType[] = ["organizer", "manager", "mechanic", "driver"];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Aperçu des permissions accordées à chaque rôle. La source de vérité est la configuration serveur.
      </p>

      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {group.label}
          </h3>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-48 min-w-[11rem]">
                    Permission
                  </th>
                  {roles.map((r) => (
                    <th key={r} className="px-3 py-2 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[r]}`}>
                        {ROLE_LABELS[r]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.permissions.map((perm, idx) => (
                  <tr
                    key={perm}
                    className={idx % 2 === 0 ? "" : "bg-muted/20"}
                  >
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">
                      {PERMISSION_LABELS[perm] ?? perm}
                    </td>
                    {roles.map((r) => {
                      const has = (ROLE_PERMISSIONS[r as PlatformRole] as Set<Permission>).has(perm);
                      return (
                        <td key={r} className="px-3 py-1.5 text-center">
                          {has ? (
                            <Check className="h-3.5 w-3.5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Onglet Invitations ───────────────────────────────────────────────────────

function InvitationsTab() {
  const { userFleetId } = useAuth();

  // Lien d'invitation statique basé sur l'ID de flotte
  const inviteLink = userFleetId
    ? `${window.location.origin}/join/${userFleetId}`
    : null;

  const copyLink = () => {
    if (!inviteLink) return;
    void navigator.clipboard.writeText(inviteLink).then(() => {});
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Lien d'invitation
          </CardTitle>
          <CardDescription>
            Partagez ce lien pour inviter un nouveau membre. Il devra créer un compte et rejoindre votre flotte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteLink ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded px-3 py-2 text-xs font-mono text-muted-foreground truncate">
                {inviteLink}
              </div>
              <Button size="sm" variant="outline" onClick={copyLink}>
                Copier
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Flotte non chargée.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">Invitations par email</CardTitle>
          <CardDescription>
            L'envoi d'invitations par email directement depuis le tableau de bord sera disponible prochainement.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function RolesHubScreen() {
  const { can } = useRoleAccess();
  const { members, isLoading } = useFleetMembers();

  const activeCount = members.filter((m) => m.is_active).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
          <Shield className="h-7 w-7" />
          Gestion des rôles
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez les accès et les permissions des membres de votre flotte.
        </p>
      </div>

      {/* Stat rapide */}
      {!isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{activeCount} membre{activeCount !== 1 ? "s" : ""} actif{activeCount !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Onglets */}
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Membres
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5">
            <Grid3X3 className="h-3.5 w-3.5" />
            Permissions
          </TabsTrigger>
          {can("member.invite") && (
            <TabsTrigger value="invitations" className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Invitations
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <MembersTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matrice des permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionsTab />
            </CardContent>
          </Card>
        </TabsContent>

        {can("member.invite") && (
          <TabsContent value="invitations" className="mt-4">
            <InvitationsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
