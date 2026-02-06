import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Interface pour un utilisateur recherché
 */
export interface SearchedUser {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

/**
 * Options pour la recherche d'utilisateurs
 */
export interface SearchUsersOptions {
  searchTerm: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook pour rechercher des utilisateurs par email ou nom
 * 
 * @param options - Options de recherche (terme de recherche, limite, activation)
 * @returns Query result avec la liste des utilisateurs correspondants
 * 
 * @example
 * ```tsx
 * const { data: users, isLoading, error } = useSearchUsers({
 *   searchTerm: "john",
 *   limit: 10,
 *   enabled: searchTerm.length >= 2
 * });
 * ```
 */
export function useSearchUsers(options: SearchUsersOptions) {
  const { searchTerm, limit = 20, enabled = true } = options;

  return useQuery<SearchedUser[], Error>({
    queryKey: ["search-users", searchTerm, limit],
    queryFn: async () => {
      // Ne pas faire de requête si le terme de recherche est trop court
      if (!searchTerm || searchTerm.trim().length < 2) {
        return [];
      }

      const { data, error } = await supabase.rpc("rechercher_utilisateurs", {
        p_terme_recherche: searchTerm.trim(),
        p_limite: limit,
      });

      if (error) {
        // Gestion explicite des erreurs avec des messages adaptés
        let errorMessage = "Impossible de rechercher des utilisateurs.";
        const msg = error.message || "";

        if (msg.includes("Permission denied") || msg.includes("permission_denied")) {
          errorMessage = "Vous n'avez pas les droits nécessaires pour rechercher des utilisateurs.";
        } else if (msg.includes("authenticated")) {
          errorMessage = "Vous devez être connecté pour rechercher des utilisateurs.";
        }

        throw new Error(errorMessage);
      }

      return (data || []) as SearchedUser[];
    },
    enabled: enabled && !!searchTerm && searchTerm.trim().length >= 2,
    // Mise en cache pendant 5 minutes
    staleTime: 5 * 60 * 1000,
    // Garder les données en cache même après démontage
    gcTime: 10 * 60 * 1000,
  });
}
