import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/cache/queryKeys';

/**
 * Données bootstrap retournées par la RPC get_user_bootstrap.
 * Remplace 4-6 appels séquentiels (session → profil → adhésions → flotte → org → onboarding)
 * par une seule requête SQL < 10ms.
 */
export interface BootstrapData {
  user_id:              string;
  email:                string | null;
  full_name:            string | null;
  phone:                string | null;
  universe:             string;
  status:               string;
  role:                 string;
  active_fleet_id:      string | null;
  active_fleet_name:    string | null;
  org_id:               string | null;
  org_name:             string | null;
  billing_status:       string | null;
  trial_ends_at:        string | null;
  plan_cache:           Record<string, unknown> | null;
  is_platform_admin:    boolean;
  onboarding_completed: boolean;
  /** Présent si le compte est suspendu / expiré. */
  error?:               string;
}

/**
 * Hook de préchargement bootstrap — à utiliser pour warm-up du cache.
 * N'interfère pas avec le AuthProvider existant ; fournit un accès rapide
 * aux données combinées profil+flotte+org sans waterfall.
 *
 * staleTime : 5 min (aligné avec le QueryClient global).
 * gcTime    : 30 min (survive aux navigations inter-pages).
 */
export function useBootstrap(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.bootstrap(),
    queryFn: async (): Promise<BootstrapData | null> => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return null;

      const { data, error } = await supabase.rpc('get_user_bootstrap');
      if (error) throw new Error(error.message);
      return data as BootstrapData | null;
    },
    enabled,
    staleTime:      5 * 60 * 1000,
    gcTime:        30 * 60 * 1000,
    retry:          1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Invalide le cache bootstrap (à appeler sur signout, changement de flotte active,
 * ou promotion de rôle).
 */
export { queryKeys };
