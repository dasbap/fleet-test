import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type GenericEnvKey =
  | "VITE_SUPABASE_URL"
  | "VITE_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY";

type LocalEnvKey =
  | "SUPABASE_LOCAL_URL"
  | "SUPABASE_LOCAL_ANON_KEY"
  | "SUPABASE_LOCAL_SERVICE_ROLE_KEY";

type SupabaseIntegrationEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export type IntegrationClients = {
  admin: SupabaseClient;
  user: SupabaseClient;
  userId: string;
  email: string;
};

function readEnv(key: GenericEnvKey | LocalEnvKey): string {
  return (process.env[key] ?? "").trim();
}

function decodeJwtPart(part: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
}

function validateLocalUrl(url: string): void {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`[integration auth] URL Supabase invalide: ${url}`);
  }

  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error(
      `[integration auth] URL Supabase non locale interdite: ${url}`
    );
  }
}

function validateLocalJwt(
  name: string,
  token: string,
  expectedRole: "anon" | "service_role"
): void {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error(`[integration auth] ${name} n'est pas un JWT valide`);
  }

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;

  try {
    header = decodeJwtPart(parts[0]);
    payload = decodeJwtPart(parts[1]);
  } catch {
    throw new Error(`[integration auth] ${name} est impossible à décoder`);
  }

  if (header.alg !== "HS256") {
    throw new Error(
      `[integration auth] ${name} utilise ${String(
        header.alg ?? "algorithme absent"
      )}; HS256 local attendu`
    );
  }

  if (payload.role !== expectedRole) {
    throw new Error(
      `[integration auth] ${name} contient le rôle ${String(
        payload.role ?? "absent"
      )}; ${expectedRole} attendu`
    );
  }
}

export function readSupabaseIntegrationEnv(): SupabaseIntegrationEnv {
  const url = readEnv("SUPABASE_LOCAL_URL") || readEnv("VITE_SUPABASE_URL");

  const anonKey =
    readEnv("SUPABASE_LOCAL_ANON_KEY") || readEnv("VITE_SUPABASE_ANON_KEY");

  const serviceRoleKey =
    readEnv("SUPABASE_LOCAL_SERVICE_ROLE_KEY") ||
    readEnv("SUPABASE_SERVICE_ROLE_KEY");

  const missing: string[] = [];

  if (!url) {
    missing.push("SUPABASE_LOCAL_URL ou VITE_SUPABASE_URL");
  }

  if (!anonKey) {
    missing.push("SUPABASE_LOCAL_ANON_KEY ou VITE_SUPABASE_ANON_KEY");
  }

  if (!serviceRoleKey) {
    missing.push(
      "SUPABASE_LOCAL_SERVICE_ROLE_KEY ou SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `[integration auth] Variables manquantes: ${missing.join(", ")}`
    );
  }

  validateLocalUrl(url);
  validateLocalJwt("clé anon", anonKey, "anon");
  validateLocalJwt("clé service_role", serviceRoleKey, "service_role");

  return {
    url,
    anonKey,
    serviceRoleKey,
  };
}

export function getMissingSupabaseIntegrationEnv(): string[] {
  try {
    readSupabaseIntegrationEnv();
    return [];
  } catch (error) {
    return [
      error instanceof Error
        ? error.message
        : "Configuration Supabase invalide",
    ];
  }
}

export function canRunSupabaseIntegrationTests(): boolean {
  return getMissingSupabaseIntegrationEnv().length === 0;
}

export async function createSupabaseIntegrationClients(): Promise<IntegrationClients> {
  const env = readSupabaseIntegrationEnv();
  const runId = createTestRunId("auth");
  const email = `integration-${runId}@esamba.test`;
  const password = `Integration-${runId}-A1!`;

  const admin = createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const user = createClient(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "Integration Test User",
        test_run_id: runId,
      },
    });

  if (createError || !created.user) {
    throw new Error(
      `[integration auth] Creation utilisateur de test impossible: ${
        createError?.message ?? "utilisateur absent"
      }`
    );
  }

  const userId = created.user.id;

  try {
    const { error: profileError } = await admin.from("profils").upsert(
      {
        user_id: userId,
        full_name: "Integration Test User",
      },
      {
        onConflict: "user_id",
      }
    );

    if (profileError) {
      throw new Error(
        `[integration auth] Creation profil utilisateur impossible: ${profileError.message}`
      );
    }

    const { data, error } = await user.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      throw new Error(
        `[integration auth] Echec de connexion pour l'utilisateur de test: ${
          error?.message ?? "utilisateur introuvable"
        }`
      );
    }

    return {
      admin,
      user,
      userId: data.user.id,
      email,
    };
  } catch (error) {
    await admin.auth.admin.deleteUser(userId);

    throw error;
  }
}

export function createTestRunId(prefix = "it"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
