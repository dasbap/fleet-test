import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type RequiredEnvKey =
  | "VITE_SUPABASE_URL"
  | "VITE_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY";

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
  };
}

export async function createSupabaseIntegrationClients(): Promise<IntegrationClients> {
  const env = readSupabaseIntegrationEnv();
  const runId = createTestRunId("auth");
  const email = `integration-${runId}@esamba.test`;
  const password = `Integration-${runId}-A1!`;

  const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const user = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Integration Test User", test_run_id: runId },
  });

  if (createError || !created.user) {
    throw new Error(
      `[integration auth] Creation utilisateur de test impossible: ${createError?.message ?? "utilisateur absent"}`,
    );
  }

  const { error: profileError } = await admin.from("profils").upsert(
    {
      user_id: created.user.id,
      full_name: "Integration Test User",
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(
      `[integration auth] Creation profil utilisateur impossible: ${profileError.message}`,
    );
  }

  const { data, error } = await user.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw new Error(
      `[integration auth] Echec de connexion pour l'utilisateur de test: ${error?.message ?? "utilisateur introuvable"}`,
    );
  }

  return {
    admin,
    user,
    userId: data.user.id,
    email,
  };
}

export function createTestRunId(prefix = "it"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
