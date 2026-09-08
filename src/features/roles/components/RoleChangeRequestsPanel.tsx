import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { supabase } from "@/integrations/supabase/client";
import type { RoleType } from "@/repositories/fleet-member.repository";
import { FLEET_ROLES, ROLE_LABELS } from "@/features/roles/constants/rolesHub.constants";

type RoleRequest = {
  id: string;
  fleet_id: string;
  user_id: string;
  previous_role: RoleType;
  requested_role: RoleType;
  status: string;
  requested_at: string;
};

type FleetMemberOption = {
  user_id: string;
  full_name: string | null;
  role: RoleType;
  is_active: boolean;
};

export function RoleChangeRequestsPanel() {
  const { user, userFleetId, memberships } = useAuth();
  const { isAdmin, isSuperAdmin } = useRoleAccess();
  const { toast } = useToast();
  const [requestedRole, setRequestedRole] = useState<RoleType | "">("");
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [members, setMembers] = useState<FleetMemberOption[]>([]);
  const [transferUserId, setTransferUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const currentMembership = useMemo(
    () => memberships.find((membership) => membership.fleet_id === userFleetId && membership.is_active),
    [memberships, userFleetId],
  );

  async function reload() {
    if (!user || !userFleetId) return;
    setLoading(true);
    const query = supabase
      .from("fleet_role_change_requests")
      .select("id,fleet_id,user_id,previous_role,requested_role,status,requested_at")
      .eq("fleet_id", userFleetId)
      .eq("status", "pending")
      .order("requested_at", { ascending: true });
    const requestResult = isAdmin ? await query : await query.eq("user_id", user.id);
    if (requestResult.error) {
      setLoading(false);
      toast({ title: "Demandes de rôle indisponibles", description: requestResult.error.message, variant: "destructive" });
      return;
    }
    setRequests((requestResult.data ?? []) as RoleRequest[]);

    if (isSuperAdmin) {
      const { data, error } = await supabase.rpc("get_fleet_members", { p_fleet_id: userFleetId });
      if (!error) {
        setMembers(((data ?? []) as FleetMemberOption[]).filter((member) => member.is_active));
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, [user?.id, userFleetId, isAdmin, isSuperAdmin]);

  async function submitRequest() {
    if (!userFleetId || !requestedRole) return;
    setBusy("request");
    const { error } = await supabase.rpc("request_fleet_role_change", {
      p_fleet_id: userFleetId,
      p_requested_role: requestedRole,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Demande impossible", description: error.message, variant: "destructive" });
      return;
    }
    setRequestedRole("");
    toast({ title: "Demande envoyée", description: "Un administrateur doit approuver votre changement de rôle." });
    await reload();
  }

  async function review(requestId: string, approve: boolean) {
    setBusy(requestId);
    const { error } = await supabase.rpc("review_fleet_role_change", {
      p_request_id: requestId,
      p_approve: approve,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Action impossible", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: approve ? "Demande approuvée" : "Demande refusée",
      description: approve ? "Le rôle a été modifié." : "Le rôle reste inchangé.",
    });
    await reload();
  }

  async function transferOrganizer() {
    if (!userFleetId || !transferUserId) return;
    setBusy("transfer");
    const { error } = await supabase.rpc("super_admin_transfer_organizer", {
      p_fleet_id: userFleetId,
      p_user_id: transferUserId,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Transfert impossible", description: error.message, variant: "destructive" });
      return;
    }
    setTransferUserId("");
    toast({ title: "Organisateur transféré", description: "Le nouvel organisateur est actif immédiatement." });
    await reload();
  }

  if (!currentMembership || !userFleetId) return null;

  const availableRoles = FLEET_ROLES.filter((role) => role !== currentMembership.role);
  const ownPending = requests.find((request) => request.user_id === user?.id);
  const organizerCandidates = members.filter((member) => member.role !== "organizer");

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Changement de rôle</p>
          <p className="text-xs text-muted-foreground">
            Un utilisateur demande un changement ; un admin l'approuve. Le super admin peut transférer l'organisateur directement.
          </p>
        </div>
        {!isSuperAdmin && !ownPending ? (
          <div className="flex gap-2">
            <Select value={requestedRole} onValueChange={(value) => setRequestedRole(value as RoleType)}>
              <SelectTrigger className="w-40 h-8"><SelectValue placeholder="Rôle demandé" /></SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!requestedRole || busy === "request"} onClick={() => void submitRequest()}>
              {busy === "request" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Demander
            </Button>
          </div>
        ) : null}
      </div>

      {loading ? <p className="text-xs text-muted-foreground">Chargement…</p> : null}

      {ownPending && !isAdmin ? (
        <p className="text-xs text-muted-foreground">
          Demande en attente : {ROLE_LABELS[ownPending.previous_role]} → {ROLE_LABELS[ownPending.requested_role]}.
        </p>
      ) : null}

      {isSuperAdmin && organizerCandidates.length > 0 ? (
        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Transfert direct de l'organisateur</p>
            <p className="text-xs text-muted-foreground">Aucune demande préalable n'est requise pour le super admin.</p>
          </div>
          <div className="flex gap-2">
            <Select value={transferUserId} onValueChange={setTransferUserId}>
              <SelectTrigger className="w-52 h-8"><SelectValue placeholder="Nouvel organisateur" /></SelectTrigger>
              <SelectContent>
                {organizerCandidates.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.full_name || member.user_id.slice(0, 8)} · {ROLE_LABELS[member.role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!transferUserId || busy === "transfer"} onClick={() => void transferOrganizer()}>
              {busy === "transfer" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Transférer
            </Button>
          </div>
        </div>
      ) : null}

      {isAdmin && requests.length > 0 ? (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Demandes en attente</p>
          {requests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card p-2">
              <div className="text-sm">
                <span className="font-mono text-xs">{request.user_id.slice(0, 8)}</span>
                <span className="mx-2 text-muted-foreground">{ROLE_LABELS[request.previous_role]} → {ROLE_LABELS[request.requested_role]}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={busy === request.id} onClick={() => void review(request.id, false)}>
                  <X className="mr-1 h-4 w-4" /> Refuser
                </Button>
                <Button size="sm" disabled={busy === request.id} onClick={() => void review(request.id, true)}>
                  {busy === request.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                  Approuver
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
