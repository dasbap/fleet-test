/**
 * RolesHubScreen — Gestion des rôles et permissions de la flotte.
 *
 * Onglets :
 *   1. Membres     — liste, rôle actif, changement de rôle, offboarding
 *   2. Permissions — matrice lecture seule 5 rôles × 9 domaines
 *   3. Historique  — audit_logs member.* filtré par flotte
 *   4. Invitations — lien flotte copiable
 */

import { useState } from "react";
import {
  Shield, Users, Grid3X3, Link2, History,
  Check, X, MoreVertical, RefreshCw,
  UserX, UserCheck, AlertTriangle, Loader2,
  LogOut,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useFleetMembersHub, type MemberRow } from "@/hooks/useFleetMembers";
import { useRoleAuditLog, AUDIT_ACTION_LABELS } from "../hooks/useRoleAuditLog";
import { useInvitations } from "@/hooks/useInvitations";
import { CreateInvitationDialog } from "@/components/invitations/CreateInvitationDialog";
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

const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  { label: "Flotte",      permissions: ["fleet.view", "fleet.create", "fleet.update", "fleet.delete"] },
  { label: "Véhicules",   permissions: ["vehicle.view", "vehicle.create", "vehicle.update", "vehicle.delete", "vehicle.assign_driver"] },
  { label: "Membres",     permissions: ["member.view", "member.invite", "member.remove", "member.update_role"] },
  { label: "Maintenance", permissions: ["maintenance.view", "maintenance.create", "maintenance.update", "maintenance.delete"] },
  { label: "Affectations",permissions: ["assignment.view_own", "assignment.view_all", "assignment.manage"] },
  { label: "Rapports",    permissions: ["report.view", "report.export"] },
  { label: "Facturation", permissions: ["billing.view", "billing.manage"] },
  { label: "DVIR",        permissions: ["dvir.submit", "dvir.view_all"] },
  { label: "Organisation",permissions: ["org.settings", "org.manage"] },
];

const PERMISSION_LABELS: Partial<Record<Permission, string>> = {
  "fleet.view": "Voir la flotte", "fleet.create": "Créer", "fleet.update": "Modifier", "fleet.delete": "Supprimer",
  "vehicle.view": "Voir", "vehicle.create": "Ajouter", "vehicle.update": "Modifier", "vehicle.delete": "Supprimer", "vehicle.assign_driver": "Affecter conducteur",
  "member.view": "Voir", "member.invite": "Inviter", "member.remove": "Retirer", "member.update_role": "Changer rôle",
  "maintenance.view": "Voir", "maintenance.create": "Créer", "maintenance.update": "Modifier", "maintenance.delete": "Supprimer",
  "assignment.view_own": "Ses affectations", "assignment.view_all": "Toutes", "assignment.manage": "Gérer",
  "report.view": "Voir", "report.export": "Exporter",
  "billing.view": "Voir", "billing.manage": "Gérer",
  "dvir.submit": "Soumettre", "dvir.view_all": "Voir tous",
  "org.settings": "Paramètres", "org.manage": "Gérer",
};

const FLEET_ROLES: RoleType[] = ["organizer", "manager", "mechanic", "driver"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const { user, userFleetId } = useAuth();
  const { can } = useRoleAccess();
  const {
    members,
    isLoading,
    isError,
    refetch,
    changeRole,
    deactivateMember,
    reactivateMember,
    offboardMember,
    fleetId,
  } = useFleetMembersHub();
  const { toast } = useToast();

  const [showInactive, setShowInactive]         = useState(false);
  const [confirmAction, setConfirmAction]        = useState<{ type: "deactivate" | "offboard"; member: MemberRow } | null>(null);

  const canManage = can("member.update_role");
  const canRemove = can("member.remove");

  const displayed = showInactive ? members : members.filter((m) => m.is_active);
  const activeCount   = members.filter((m) => m.is_active).length;
  const inactiveCount = members.filter((m) => !m.is_active).length;

  const handleRoleChange = async (member: MemberRow, newRole: RoleType) => {
    if (newRole === member.role || !fleetId) return;
    try {
      await changeRole.mutateAsync({
        membershipId: member.id,
        fleetId,
        userId: member.user_id,
        newRole,
      });
      toast({ title: "Rôle mis à jour", description: `${member.full_name ?? "Membre"} → ${ROLE_LABELS[newRole]}` });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDeactivate = async (member: MemberRow) => {
    if (!fleetId) return;
    try {
      await deactivateMember.mutateAsync({
        memberId: member.id,
        fleetId,
        userId: member.user_id,
        role: member.role,
      });
      toast({ title: "Accès désactivé", description: `${member.full_name ?? "Membre"} n'a plus accès à la flotte.` });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
    setConfirmAction(null);
  };

  const handleOffboard = async (member: MemberRow) => {
    if (!fleetId) return;
    try {
      await offboardMember.mutateAsync({ userId: member.user_id, fleetId });
      toast({ title: "Membre retiré", description: `${member.full_name ?? "Membre"} a été complètement retiré de la flotte.` });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
    setConfirmAction(null);
  };

  const handleReactivate = async (member: MemberRow) => {
    if (!fleetId) return;
    try {
      await reactivateMember.mutateAsync({ userId: member.user_id, role: member.role, fleetId });
      toast({ title: "Accès réactivé", description: `${member.full_name ?? "Membre"} a de nouveau accès.` });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement des membres…
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
        <p className="text-sm text-muted-foreground">
          {activeCount} actif{activeCount !== 1 ? "s" : ""}
          {inactiveCount > 0 && ` · ${inactiveCount} inactif${inactiveCount !== 1 ? "s" : ""}`}
        </p>
        <div className="flex items-center gap-3">
          {inactiveCount > 0 && (
            <div className="flex items-center gap-2">
              <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} className="scale-90" />
              <Label htmlFor="show-inactive" className="text-sm cursor-pointer">Afficher inactifs</Label>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {displayed.length === 0 && (
          <p className="text-center py-10 text-muted-foreground text-sm">Aucun membre à afficher.</p>
        )}

        {displayed.map((member) => {
          const isSelf    = member.user_id === user?.id;
          const isPending =
            changeRole.isPending
            || deactivateMember.isPending
            || reactivateMember.isPending
            || offboardMember.isPending;

          return (
            <div key={member.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${member.is_active ? "bg-card" : "bg-muted/40 opacity-60"}`}>
              <MemberInitials name={member.full_name} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{member.full_name ?? "Sans nom"}</span>
                  {isSelf && <span className="text-xs text-muted-foreground">(vous)</span>}
                  {!member.is_active && <span className="text-xs text-destructive font-medium">Inactif</span>}
                </div>
                {member.phone && <p className="text-xs text-muted-foreground mt-0.5">{member.phone}</p>}
              </div>

              {/* Sélecteur de rôle */}
              {canManage && !isSelf ? (
                <Select value={member.role} onValueChange={(v) => void handleRoleChange(member, v as RoleType)} disabled={isPending || !member.is_active}>
                  <SelectTrigger className="w-36 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FLEET_ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
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
                      <>
                        <DropdownMenuItem onClick={() => setConfirmAction({ type: "deactivate", member })} className="text-orange-600 focus:text-orange-600">
                          <UserX className="h-3.5 w-3.5 mr-2" /> Suspendre l'accès
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setConfirmAction({ type: "offboard", member })} className="text-destructive focus:text-destructive">
                          <LogOut className="h-3.5 w-3.5 mr-2" /> Retirer de la flotte
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem onClick={() => void handleReactivate(member)}>
                        <UserCheck className="h-3.5 w-3.5 mr-2" /> Réactiver l'accès
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      {/* Dialog confirmation */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "offboard" ? "Retirer de la flotte ?" : "Suspendre l'accès ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "offboard"
                ? `${confirmAction.member.full_name ?? "Ce membre"} sera complètement retiré. Tous ses rôles seront désactivés et l'action sera tracée dans l'historique.`
                : `${confirmAction?.member.full_name ?? "Ce membre"} perdra temporairement l'accès. Vous pourrez le réactiver à tout moment.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === "offboard") void handleOffboard(confirmAction.member);
                else void handleDeactivate(confirmAction.member);
              }}
            >
              {confirmAction?.type === "offboard" ? "Retirer" : "Suspendre"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Onglet Permissions ───────────────────────────────────────────────────────

function PermissionsTab() {
  const roles: RoleType[] = ["organizer", "manager", "mechanic", "driver"];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Matrice des droits par rôle. Source de vérité : configuration serveur Supabase.
      </p>
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.label}</h3>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-44 min-w-[10rem]">Action</th>
                  {roles.map((r) => (
                    <th key={r} className="px-3 py-2 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[r]}`}>{ROLE_LABELS[r]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.permissions.map((perm, idx) => (
                  <tr key={perm} className={idx % 2 === 0 ? "" : "bg-muted/20"}>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{PERMISSION_LABELS[perm] ?? perm}</td>
                    {roles.map((r) => {
                      const has = (ROLE_PERMISSIONS[r as PlatformRole] as Set<Permission>).has(perm);
                      return (
                        <td key={r} className="px-3 py-1.5 text-center">
                          {has
                            ? <Check className="h-3.5 w-3.5 text-green-500 mx-auto" />
                            : <X className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />}
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

// ─── Onglet Historique ────────────────────────────────────────────────────────

function HistoriqueTab() {
  const { data: logs = [], isLoading, isError, refetch } = useRoleAuditLog();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Chargement…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-muted-foreground">Impossible de charger l'historique.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>Réessayer</Button>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
        <History className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Aucune action enregistrée pour l'instant.</p>
        <p className="text-xs text-muted-foreground">Les changements de rôle et d'accès apparaîtront ici.</p>
      </div>
    );
  }

  const ACTION_COLORS: Record<string, string> = {
    "member.added":        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    "member.role_changed": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    "member.deactivated":  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    "member.reactivated":  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    "member.offboarded":   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    "member.updated":      "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
    "member.invited":      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    "vehicle.created":     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    "vehicle.deleted":     "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    "closure.validated":   "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    "maintenance.validated":"bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    "org.settings_changed":"bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300",
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end mb-1">
        <Button variant="ghost" size="sm" onClick={() => void refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Actualiser
        </Button>
      </div>

      {logs.map((log) => {
        const meta = log.metadata;
        const label = AUDIT_ACTION_LABELS[log.action] ?? log.action;
        const colorClass = ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground";

        // Description contextuelle selon le type d'action
        let detail = "";
        if (log.action === "member.role_changed") {
          const oldRole = meta.old_role as string | undefined;
          const newRole = meta.new_role as string | undefined;
          if (oldRole && newRole) {
            detail = `${ROLE_LABELS[oldRole as RoleType] ?? oldRole} → ${ROLE_LABELS[newRole as RoleType] ?? newRole}`;
          }
        } else if (log.action === "member.offboarded") {
          const count = meta.roles_deactivated as number | undefined;
          if (count !== undefined) detail = `${count} rôle${count > 1 ? "s" : ""} désactivé${count > 1 ? "s" : ""}`;
        }

        return (
          <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
            <div className="mt-0.5">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                {label}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground" title={format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}>
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Onglet Invitations ───────────────────────────────────────────────────────

function InvitationsTab() {
  const { userFleetId } = useAuth();
  const { toast } = useToast();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { data: invitations, isLoading, refetch } = useInvitations(userFleetId ?? undefined);

  const inviteLink = userFleetId ? `${window.location.origin}/join/${userFleetId}` : null;

  const copyLink = () => {
    if (!inviteLink) return;
    void navigator.clipboard.writeText(inviteLink).then(() => {
      toast({ title: "Lien copié", description: "Partagez-le avec le futur membre." });
    });
  };

  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(code).then(() => {
      toast({ title: "Code copié", description: "Le code d'invitation a été copié." });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {userFleetId && (
          <>
            <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
              Créer un code
            </Button>
            <CreateInvitationDialog
              open={inviteDialogOpen}
              onOpenChange={setInviteDialogOpen}
              fleetId={userFleetId}
              onSuccess={() => void refetch()}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Codes d'invitation actifs
          </CardTitle>
          <CardDescription>
            Créez un code à usage limité ou partagez le lien d'invitation flotte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </p>
          )}
          {!isLoading && (!invitations || invitations.length === 0) && (
            <p className="text-sm text-muted-foreground">Aucun code actif. Créez une invitation ci-dessus.</p>
          )}
          {invitations?.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
              <span className="font-mono text-sm flex-1 truncate">{inv.code}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {inv.current_uses}{inv.max_uses != null ? `/${inv.max_uses}` : ""} utilisations
              </span>
              <Button size="sm" variant="outline" onClick={() => copyCode(inv.code)}>Copier</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Lien d'invitation flotte
          </CardTitle>
          <CardDescription>
            Partagez ce lien pour inviter un membre. Il devra créer un compte et rejoindre votre flotte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteLink ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded px-3 py-2 text-xs font-mono text-muted-foreground truncate">
                {inviteLink}
              </div>
              <Button size="sm" variant="outline" onClick={copyLink}>Copier</Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Flotte non chargée.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function RolesHubScreen() {
  const { can } = useRoleAccess();
  const { members, isLoading } = useFleetMembersHub();
  const activeCount = members.filter((m) => m.is_active).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
          <Shield className="h-7 w-7" /> Gestion des rôles
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez les accès et les permissions des membres de votre flotte.
        </p>
      </div>

      {!isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{activeCount} membre{activeCount !== 1 ? "s" : ""} actif{activeCount !== 1 ? "s" : ""}</span>
        </div>
      )}

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Membres
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5">
            <Grid3X3 className="h-3.5 w-3.5" /> Permissions
          </TabsTrigger>
          <TabsTrigger value="historique" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> Historique
          </TabsTrigger>
          {can("member.invite") && (
            <TabsTrigger value="invitations" className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Invitations
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card><CardContent className="pt-4"><MembersTab /></CardContent></Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Matrice des permissions</CardTitle></CardHeader>
            <CardContent><PermissionsTab /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historique" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique des actions</CardTitle>
              <CardDescription>50 dernières actions sur les membres de la flotte.</CardDescription>
            </CardHeader>
            <CardContent><HistoriqueTab /></CardContent>
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
