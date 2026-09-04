import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from "../env.js";
import { fetchWithSupabaseTimeout } from "./fetchWithTimeout.js";

/** Client service role (webhooks / jobs uniquement). */
export function createSupabaseServiceClient(): SupabaseClient | null {
  const key = getSupabaseServiceRoleKey();
  if (!key) return null;
  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: fetchWithSupabaseTimeout,
      headers: { "x-client-info": "smart-fleet-africa-bff-service@1.0.0" },
    },
  });
}

/** Anon sans session (santé / métriques). */
export function createSupabaseAnonClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: fetchWithSupabaseTimeout,
      headers: { "x-client-info": "smart-fleet-africa-bff-anon@1.0.0" },
    },
  });
}
