import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/server/env";

/**
 * Client Supabase dont les requêtes s’exécutent avec le JWT utilisateur (RLS identique au navigateur).
 */
export function createSupabaseUserClient(accessToken: string): SupabaseClient {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-client-info": "smart-fleet-africa-bff@1.0.0",
      },
    },
  });
}
