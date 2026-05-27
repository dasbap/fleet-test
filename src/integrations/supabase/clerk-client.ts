/**
 * Factory Supabase authentifié avec un JWT Clerk.
 *
 * À utiliser dans les composants qui ont accès au token Clerk via useAuth() :
 *
 *   const { getToken } = useAuth();
 *   const client = await createClerkSupabaseClient(getToken);
 *   const { data } = await client.from("vehicules").select("*");
 *
 * Prérequis (à configurer dans les dashboards) :
 *   1. Clerk dashboard → JWT Templates → créer "supabase"
 *      Payload : { "role": "authenticated", "sub": "{{user.id}}" }
 *      Signing key : JWT secret Supabase (Settings → API → JWT Settings)
 *   2. Supabase dashboard → Auth → Third-party Auth → ajouter JWKS Clerk :
 *      https://clerk.e-samba.com/.well-known/jwks.json
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type GetTokenFn = (options?: { template?: string }) => Promise<string | null>;

/**
 * Crée un client Supabase avec le JWT Clerk en header Authorization.
 * Le JWT est récupéré via le template "supabase" configuré dans Clerk.
 */
export async function createClerkSupabaseClient(
  getToken: GetTokenFn
): Promise<SupabaseClient> {
  const token = await getToken({ template: "supabase" });

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "x-client-info": "smart-fleet-africa@1.0.0",
      },
    },
    auth: {
      // Clerk gère la session — Supabase ne doit pas interférer
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Hook utilitaire : retourne une fonction qui crée un client Supabase
 * à jour avec le token Clerk courant. À utiliser avec React Query ou SWR.
 *
 * Exemple :
 *   const getClient = useClerkSupabaseClientFactory();
 *   const { data } = useQuery({ queryFn: async () => {
 *     const client = await getClient();
 *     return client.from("vehicules").select("*");
 *   }});
 */
export function makeClerkSupabaseClientFactory(getToken: GetTokenFn) {
  return () => createClerkSupabaseClient(getToken);
}
