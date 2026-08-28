import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAuthStorage } from '@/lib/auth/supabaseAuthStorage';

const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (typeof SUPABASE_URL !== 'string' || !SUPABASE_URL) {
  throw new Error(
    "La variable d'environnement VITE_SUPABASE_URL est manquante ou invalide. " +
      "Merci de vérifier votre fichier .env.local"
  );
}

if (typeof SUPABASE_ANON_KEY !== 'string' || !SUPABASE_ANON_KEY) {
  throw new Error(
    "La variable d'environnement VITE_SUPABASE_ANON_KEY est manquante ou invalide. " +
      "Merci de vérifier votre fichier .env.local"
  );
}

const estEnvCapacitor: boolean =
  typeof window !== 'undefined' &&
  !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.();

export function createEphemeralSupabaseClient(accessToken?: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    accessToken: accessToken ? async () => accessToken : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        "x-client-info": "smart-fleet-africa@1.0.0",
      },
    },
  });
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: getSupabaseAuthStorage(),
      storageKey: "sfa_auth_token",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !estEnvCapacitor,
      flowType: "pkce",
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        "x-client-info": "smart-fleet-africa@1.0.0",
      },
    },
  }
);
