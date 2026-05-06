import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type TestAuthContext = {
  admin: SupabaseClient;
  user: SupabaseClient;
  userId: string;
};

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const testEmail = process.env.SUPABASE_TEST_EMAIL ?? "";
const testPassword = process.env.SUPABASE_TEST_PASSWORD ?? "";

export function getMissingAuthEnv(): string[] {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("VITE_SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY");
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!testEmail) missing.push("SUPABASE_TEST_EMAIL");
  if (!testPassword) missing.push("SUPABASE_TEST_PASSWORD");
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

  const { data, error } = await user.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (error || !data.user) {
    throw new Error(
      `[integration auth] Echec de connexion utilisateur de test (${testEmail}): ${error?.message ?? "utilisateur introuvable"}`,
    );
  }

  return {
    admin,
    user,
    userId: data.user.id,
  };
}
