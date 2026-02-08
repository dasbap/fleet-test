import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { mapSupabaseErrorToFrench } from "@/lib/mapSupabaseError";
import { FleetMemberService } from "@/services/fleet-member.service";
import { FleetMemberRepository } from "@/repositories/fleet-member.repository";

// Instances singleton des services et repositories
const fleetMemberRepository = new FleetMemberRepository();
const fleetMemberService = new FleetMemberService(fleetMemberRepository);

// Réexporter les types pour compatibilité
export type FleetMember = {
  id: string;
  user_id: string;
  role: "organizer" | "manager" | "driver" | "mechanic";
  is_active: boolean;
  created_at: string;
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
  email: string | null;
};

export interface AddMemberData {
  email: string;
  role: "organizer" | "manager" | "driver" | "mechanic";
}

/**
 * Récupère tous les membres d'une flotte avec leurs profils
 */
export function useFleetMembers(fleetId?: string) {
  return useQuery<FleetMember[], Error>({
    queryKey: ["fleet-members", fleetId],
    queryFn: () => {
      if (!fleetId) return [];
      return fleetMemberService.getFleetMembers(fleetId);
    },
    enabled: !!fleetId,
  });
}

/**
 * Ajoute un membre à une flotte via son email
 */
export function useAddFleetMember() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { fleetId: string; data: AddMemberData }>({
    mutationFn: async ({ fleetId, data }) => {
      await fleetMemberService.addMemberByEmail(fleetId, data.email, data.role);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fleet-members", variables.fleetId] });
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
 * Utilise creer_ou_mettre_a_jour_adhesion_flotte (upsert par fleet_id + user_id + role).
 * membershipId est accepté pour cohérence d'API / traçabilité mais n'est pas utilisé par la RPC.
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { membershipId: string; fleetId: string; userId: string; role: "organizer" | "manager" | "driver" | "mechanic" }
  >({
    mutationFn: async ({ membershipId, fleetId, userId, role }) => {
      await fleetMemberService.updateMemberRole(membershipId, fleetId, userId, role);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fleet-members", variables.fleetId] });
      queryClient.invalidateQueries({ queryKey: ["user-fleet"] });
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

  return useMutation<void, Error, { membershipId: string; fleetId: string }>({
    mutationFn: async ({ membershipId, fleetId }) => {
      await fleetMemberService.removeMember(membershipId, fleetId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fleet-members", variables.fleetId] });
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
