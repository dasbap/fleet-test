import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { mapSupabaseErrorToFrench } from "@/lib/mapSupabaseError";
import { FleetMemberService } from "@/services/fleet-member.service";
import { FleetMemberRepository } from "@/repositories/fleet-member.repository";
import { useAuth } from "@/hooks/useAuth";
import type { RoleType } from "@/repositories/fleet-member.repository";

// Instances singleton des services et repositories
const fleetMemberRepository = new FleetMemberRepository();
const fleetMemberService = new FleetMemberService(fleetMemberRepository);

// Réexporter les types pour compatibilité
export type FleetMember = {
  id: string;
  user_id: string;
  fleet_id: string;
  role: RoleType;
  is_active: boolean;
  created_at: string;
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
  email: string | null;
};

/** Alias pour le hub rôles (même forme que l'ancien MemberRow). */
export type MemberRow = FleetMember & {
  full_name: string | null;
  phone: string | null;
};

export interface AddMemberData {
  email: string;
  role: RoleType;
  /** Numéro normalisé E.164 (+237XXXXXXXXX) — optionnel, pré-active le chauffeur côté SMS. */
  phone?: string;
}

function toMemberRow(m: FleetMember): MemberRow {
  return {
    ...m,
    full_name: m.profile?.full_name ?? null,
    phone: m.profile?.phone ?? null,
  };
}

/**
 * Récupère tous les membres d'une flotte avec leurs profils
 */
export function useFleetMembers(fleetId?: string) {
  return useQuery<FleetMember[], Error>({
    queryKey: ['fleet-members', fleetId],
    queryFn: async () => {
      if (!fleetId) return [];
      try {
        return await fleetMemberService.getFleetMembers(fleetId);
      } catch (err) {
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    enabled: !!fleetId,
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Hub rôles : membres de la flotte active + mutations (architecture service).
 */
export function useFleetMembersHub() {
  const { userFleetId } = useAuth();
  const queryClient = useQueryClient();
  const fleetId = userFleetId ?? undefined;

  const query = useFleetMembers(fleetId);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['fleet-members', fleetId] });
    void queryClient.invalidateQueries({ queryKey: ['role-audit-log', fleetId] });
  };

  const changeRole = useMutation({
    mutationFn: async ({ membershipId, fleetId: fid, userId, newRole }: {
      membershipId: string;
      fleetId: string;
      userId: string;
      newRole: RoleType;
    }) => {
      await fleetMemberService.updateMemberRole(membershipId, fid, userId, newRole);
    },
    onSuccess: invalidate,
  });

  const deactivateMember = useMutation({
    mutationFn: async ({ fleetId: fid, userId, role }: {
      memberId: string;
      fleetId: string;
      userId: string;
      role: RoleType;
    }) => {
      await fleetMemberService.setMemberActive(fid, userId, role, false);
    },
    onSuccess: invalidate,
  });

  const reactivateMember = useMutation({
    mutationFn: async ({ fleetId: fid, userId, role }: {
      userId: string;
      role: RoleType;
      fleetId?: string;
    }) => {
      const targetFleet = fid ?? fleetId;
      if (!targetFleet) throw new Error('Flotte non définie.');
      await fleetMemberService.setMemberActive(targetFleet, userId, role, true);
    },
    onSuccess: invalidate,
  });

  const offboardMember = useMutation({
    mutationFn: async ({ userId, fleetId: fid }: { userId: string; fleetId: string }) => {
      await fleetMemberService.offboardMember(userId, fid);
    },
    onSuccess: invalidate,
  });

  const members: MemberRow[] = (query.data ?? []).map(toMemberRow);

  return {
    members,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    changeRole,
    deactivateMember,
    reactivateMember,
    offboardMember,
    fleetId,
  };
}

/**
 * Ajoute un membre à une flotte via son email
 */
export function useAddFleetMember() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { fleetId: string; data: AddMemberData }>({
    mutationFn: async ({ fleetId, data }) => {
      await fleetMemberService.addMemberByEmail(fleetId, data.email, data.role, data.phone);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fleet-members', variables.fleetId] });
      toast({
        title: "✅ Membre ajouté",
        description: "Le membre a été ajouté à l'équipe avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: mapSupabaseErrorToFrench(error.message),
        variant: "destructive",
      });
    },
  });
}

/**
 * Met à jour le rôle d'un membre.
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { membershipId: string; fleetId: string; userId: string; role: RoleType }
  >({
    mutationFn: async ({ membershipId, fleetId, userId, role }) => {
      await fleetMemberService.updateMemberRole(membershipId, fleetId, userId, role);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fleet-members', variables.fleetId] });
      queryClient.invalidateQueries({ queryKey: ['role-audit-log', variables.fleetId] });
      toast({
        title: "✅ Rôle mis à jour",
        description: "Le rôle du membre a été modifié avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: mapSupabaseErrorToFrench(error.message),
        variant: "destructive",
      });
    },
  });
}

/**
 * Désactive un membre (le retire de l'équipe)
 */
export function useRemoveFleetMember() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { membershipId: string; fleetId: string; userId: string; role: RoleType }>({
    mutationFn: async ({ membershipId, fleetId, userId, role }) => {
      await fleetMemberService.setMemberActive(fleetId, userId, role, false);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fleet-members', variables.fleetId] });
      queryClient.invalidateQueries({ queryKey: ['role-audit-log', variables.fleetId] });
      toast({
        title: "✅ Membre retiré",
        description: "Le membre a été retiré de l'équipe.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: mapSupabaseErrorToFrench(error.message),
        variant: "destructive",
      });
    },
  });
}

/**
 * Offboarding complet d'un membre (tous les rôles désactivés).
 */
export function useOffboardFleetMember() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { userId: string; fleetId: string }>({
    mutationFn: async ({ userId, fleetId }) => {
      await fleetMemberService.offboardMember(userId, fleetId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fleet-members', variables.fleetId] });
      queryClient.invalidateQueries({ queryKey: ['role-audit-log', variables.fleetId] });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: mapSupabaseErrorToFrench(error.message),
        variant: "destructive",
      });
    },
  });
}
