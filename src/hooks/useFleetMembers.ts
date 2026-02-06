import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { mapSupabaseErrorToFrench } from "@/lib/mapSupabaseError";

export interface FleetMember {
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
}

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
    queryFn: async () => {
      if (!fleetId) return [];

      const { data, error } = await supabase
        .from("flotte_adhesions")
        .select(
          `
          id,
          user_id,
          role,
          is_active,
          created_at,
          profile:profils!flotte_adhesions_user_id_fkey(full_name, phone)
        `
        )
        .eq("fleet_id", fleetId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      // Note: Les emails ne sont pas récupérables directement pour des raisons de sécurité
      // Ils seront affichés uniquement pour l'utilisateur connecté
      return (data || []).map((member: any) => ({
        ...member,
        email: null, // Sera récupéré côté serveur si nécessaire
      })) as FleetMember[];
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
      console.log("Tentative d'ajout de membre:", { fleetId, email: data.email, role: data.role });
      
      // Utiliser la fonction RPC qui gère la recherche par email
      const { data: membershipId, error: membershipError } = await supabase.rpc(
        "ajouter_membre_par_email",
        {
          p_fleet_id: fleetId,
          p_email: data.email,
          p_role: data.role,
        }
      );

      console.log("Résultat de ajouter_membre_par_email:", { membershipId, error: membershipError });

      if (membershipError) {
        // Gestion explicite des erreurs avec des messages adaptés
        let errorMessage = "Impossible d'ajouter le membre à la flotte.";
        const msg = membershipError.message || "";
        console.error("Erreur lors de l'ajout du membre:", msg);
        
        if (msg.includes("User not found") || msg.includes("user_not_found")) {
          errorMessage = "Aucun utilisateur trouvé avec cet email. L'utilisateur doit d'abord créer un compte.";
        } else if (msg.includes("Permission denied") || msg.includes("permission_denied")) {
          errorMessage = "Vous n'avez pas les droits nécessaires pour ajouter un membre (manager ou organisateur requis).";
        } else if (msg.includes("Fleet not found") || msg.includes("fleet_not_found")) {
          errorMessage = "Flotte introuvable. Veuillez rafraîchir la page ou vérifier l'identifiant de la flotte.";
        } else if (msg.includes("duplicate key value") || msg.includes("already exists")) {
          errorMessage = "Cet utilisateur est déjà membre de la flotte avec ce rôle.";
        }
        throw new Error(errorMessage);
      }
      
      if (!membershipId) {
        console.warn("Aucun membershipId retourné, mais pas d'erreur non plus");
        // Ne pas jeter d'erreur si membershipId est null mais qu'il n'y a pas d'erreur
        // La fonction RPC peut retourner null dans certains cas valides
      } else {
        console.log("Membre ajouté avec succès, membershipId:", membershipId);
      }
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
    mutationFn: async ({ fleetId, userId, role }) => {
      // Utiliser creer_ou_mettre_a_jour_adhesion_flotte pour gérer les conflits de contrainte unique
      // Si l'utilisateur a déjà un rôle différent, cela créera un nouveau membership
      // ou mettra à jour l'existant de manière atomique
      const { data: newMembershipId, error } = await supabase.rpc(
        "creer_ou_mettre_a_jour_adhesion_flotte",
        {
          p_fleet_id: fleetId,
          p_user_id: userId,
          p_role: role,
          p_is_active: true,
        }
      );

      if (error || !newMembershipId) {
        throw new Error(error?.message || "Impossible de mettre à jour le rôle.");
      }
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
    mutationFn: async ({ membershipId }) => {
      const { error } = await supabase
        .from("flotte_adhesions")
        .update({ is_active: false })
        .eq("id", membershipId);

      if (error) {
        throw new Error(error.message || "Impossible de retirer le membre.");
      }
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
