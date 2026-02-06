import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EsambaDataVerification {
  organisation: boolean;
  flotte: boolean;
  membership_organizer: boolean;
  vehicule_esamba_001: boolean;
  invitation_esamba_2024: boolean;
}

/**
 * Vérifie la présence des données ESAMBA-2024 via l'appel RPC dédié.
 * Renvoie un objet avec le statut de chaque entité clé.
 */
export function useEsambaDataVerification() {
  return useQuery<EsambaDataVerification | null, Error>({
    queryKey: ["esamba-data-verification"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verifier_esamba_2024");
      if (error) {
        throw new Error("Erreur lors de l'exécution de la vérification ESAMBA.");
      }
      // La fonction RPC retourne un tableau d'un seul objet, ou vide
      return data && Array.isArray(data) && data.length > 0 ? data[0] : null;
    },
  });
}