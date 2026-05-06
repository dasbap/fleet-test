import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type RequiredEnvKey =
  | "VITE_SUPABASE_URL"
  | "VITE_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "SUPABASE_TEST_EMAIL"
  | "SUPABASE_TEST_PASSWORD";

type SupabaseIntegrationEnv = Record<RequiredEnvKey, string>;

export type IntegrationClients = {
  admin: SupabaseClient;
  user: SupabaseClient;
  userId: string;
  email: string;
};

const REQUIRED_ENV_KEYS: RequiredEnvKey[] = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_TEST_EMAIL",
  "SUPABASE_TEST_PASSWORD",
];

function getEnvValue(key: RequiredEnvKey): string {
  return (process.env[key] ?? "").trim();
}

export function getMissingSupabaseIntegrationEnv(): RequiredEnvKey[] {
  return REQUIRED_ENV_KEYS.filter((key) => !getEnvValue(key));
}

export function canRunSupabaseIntegrationTests(): boolean {
  return getMissingSupabaseIntegrationEnv().length === 0;
}

export function readSupabaseIntegrationEnv(): SupabaseIntegrationEnv {
  const missing = getMissingSupabaseIntegrationEnv();
  if (missing.length > 0) {
    throw new Error(
      `[integration auth] Variables manquantes: ${missing.join(", ")}. ` +
        "Ajoutez les secrets CI Supabase pour la cible distante.",
    );
  }

  return {
    VITE_SUPABASE_URL: getEnvValue("VITE_SUPABASE_URL"),
    VITE_SUPABASE_ANON_KEY: getEnvValue("VITE_SUPABASE_ANON_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: getEnvValue("SUPABASE_SERVICE_ROLE_KEY"),
    SUPABASE_TEST_EMAIL: getEnvValue("SUPABASE_TEST_EMAIL"),
    SUPABASE_TEST_PASSWORD: getEnvValue("SUPABASE_TEST_PASSWORD"),
  };
}

export async function createSupabaseIntegrationClients(): Promise<IntegrationClients> {
  const env = readSupabaseIntegrationEnv();

  const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const user = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await user.auth.signInWithPassword({
    email: env.SUPABASE_TEST_EMAIL,
    password: env.SUPABASE_TEST_PASSWORD,
  });

  if (error || !data.user) {
    throw new Error(
      `[integration auth] Echec de connexion pour ${env.SUPABASE_TEST_EMAIL}: ${error?.message ?? "utilisateur introuvable"}`,
    );
  }

  return {
    admin,
    user,
    userId: data.user.id,
    email: env.SUPABASE_TEST_EMAIL,
  };
}

export function createTestRunId(prefix = "it"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
