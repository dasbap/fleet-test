import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// todo to update vercel
type TestAuthContext = {
  admin: SupabaseClient;
  user: SupabaseClient;
  userId: string;
};

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function getMissingAuthEnv(): string[] {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("VITE_SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY");
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

export function canRunIntegrationAuthBootstrap(): boolean {
  return getMissingAuthEnv().length === 0;
}

export async function bootstrapIntegrationAuth(): Promise<TestAuthContext> {
  const missing = getMissingAuthEnv();
  if (missing.length > 0) {
    throw new Error(
      `[integration auth] Variables manquantes: ${missing.join(", ")}. ` +
        "Configurez les secrets CI ou .env.local avant d'executer les tests d'integration.",
    );
  }

  const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const user = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const runId = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `integration-${runId}@esamba.test`;
  const password = `Integration-${runId}-A1!`;

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
      `[integration auth] Echec de connexion utilisateur de test: ${error?.message ?? "utilisateur introuvable"}`,
    );
  }

  return {
    admin,
    user,
    userId: data.user.id,
  };
}
