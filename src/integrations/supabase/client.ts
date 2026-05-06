import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Récupération des variables d'environnement avec typage explicite
const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérification stricte des variables d'environnement
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

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      // Clé namespaced — évite les collisions si plusieurs apps sur le même domaine
      storageKey: "sfa_auth_token",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // PKCE : protection contre l'interception du code OAuth (RFC 7636)
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
