import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface IntegrationSupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  databaseUrl?: string;
}

export interface IntegrationClients {
  /**
   * Client utilisant la clé secrète/service_role.
   * Il contourne les politiques RLS.
   */
  admin: SupabaseClient;

  /**
   * Client authentifié avec l’utilisateur temporaire du test.
   * Il est soumis aux politiques RLS.
   */
  user: SupabaseClient;

  /**
   * Client public non authentifié.
   */
  anon: SupabaseClient;

  /**
   * Identifiant de l’utilisateur temporaire.
   */
  userId: string;

  /**
   * Adresse e-mail de l’utilisateur temporaire.
   */
  userEmail: string;
}

/**
 * Alias conservé pour les éventuels imports existants.
 */
export type IntegrationSupabaseClients = IntegrationClients;

const LOCAL_SUPABASE_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function readFirstEnvironmentVariable(
  names: readonly string[]
): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

function isLegacyJwt(value: string): boolean {
  const parts = value.split(".");

  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function isPublishableSupabaseKey(value: string): boolean {
  return (
    value.startsWith("sb_publishable_") &&
    value.length > "sb_publishable_".length
  );
}

function isSecretSupabaseKey(value: string): boolean {
  return value.startsWith("sb_secret_") && value.length > "sb_secret_".length;
}

function isValidAnonKey(value: string): boolean {
  return isLegacyJwt(value) || isPublishableSupabaseKey(value);
}

function isValidServiceRoleKey(value: string): boolean {
  return isLegacyJwt(value) || isSecretSupabaseKey(value);
}

function assertLocalSupabaseUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`[integration auth] URL Supabase invalide : ${value}`);
  }

  if (!LOCAL_SUPABASE_HOSTS.has(url.hostname)) {
    throw new Error(
      `[integration auth] URL Supabase non locale interdite : ${value}`
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      `[integration auth] protocole Supabase invalide : ${url.protocol}`
    );
  }

  return url.toString().replace(/\/$/, "");
}

function createClientOptions() {
  return {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  };
}

/**
 * Produit un identifiant unique et lisible pour chaque exécution.
 *
 * Exemple :
 * fleet-1722096000000-550e8400e29b
 */
export function createTestRunId(prefix = "integration"): string {
  const normalizedPrefix =
    prefix
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "integration";

  const timestamp = Date.now();
  const uniquePart = randomUUID().replaceAll("-", "").slice(0, 12);

  return `${normalizedPrefix}-${timestamp}-${uniquePart}`;
}

export function getIntegrationSupabaseConfig(): IntegrationSupabaseConfig {
  const rawUrl = readFirstEnvironmentVariable([
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
  ]);

  const anonKey = readFirstEnvironmentVariable([
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
  ]);

  const serviceRoleKey = readFirstEnvironmentVariable([
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);

  const databaseUrl = readFirstEnvironmentVariable([
    "SUPABASE_DB_URL",
    "DATABASE_URL",
  ]);

  if (!rawUrl) {
    throw new Error(
      "[integration auth] variable SUPABASE_URL ou VITE_SUPABASE_URL manquante"
    );
  }

  if (!anonKey) {
    throw new Error(
      "[integration auth] variable SUPABASE_ANON_KEY ou VITE_SUPABASE_ANON_KEY manquante"
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "[integration auth] variable SUPABASE_SERVICE_ROLE_KEY manquante"
    );
  }

  const url = assertLocalSupabaseUrl(rawUrl);

  if (!isValidAnonKey(anonKey)) {
    throw new Error(
      "[integration auth] clé anon invalide : JWT legacy ou clé sb_publishable_ attendue"
    );
  }

  if (!isValidServiceRoleKey(serviceRoleKey)) {
    throw new Error(
      "[integration auth] clé service role invalide : JWT legacy ou clé sb_secret_ attendue"
    );
  }

  if (isSecretSupabaseKey(anonKey)) {
    throw new Error(
      "[integration auth] une clé sb_secret_ ne peut pas être utilisée comme clé anon"
    );
  }

  if (isPublishableSupabaseKey(serviceRoleKey)) {
    throw new Error(
      "[integration auth] une clé sb_publishable_ ne peut pas être utilisée comme clé service role"
    );
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
    databaseUrl,
  };
}

export function getMissingSupabaseIntegrationEnv(): string[] {
  const missing: string[] = [];

  const rawUrl = readFirstEnvironmentVariable([
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
  ]);

  const anonKey = readFirstEnvironmentVariable([
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
  ]);

  const serviceRoleKey = readFirstEnvironmentVariable([
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);

  if (!rawUrl) {
    missing.push("SUPABASE_URL ou VITE_SUPABASE_URL");
  }

  if (!anonKey) {
    missing.push("SUPABASE_ANON_KEY ou VITE_SUPABASE_ANON_KEY");
  }

  if (!serviceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missing.length > 0) {
    return missing;
  }

  try {
    getIntegrationSupabaseConfig();
  } catch (error) {
    missing.push(error instanceof Error ? error.message : String(error));
  }

  return missing;
}

export function getIntegrationConfigurationError(): Error | null {
  const missing = getMissingSupabaseIntegrationEnv();

  if (missing.length === 0) {
    return null;
  }

  return new Error(missing.join(", "));
}

export function canRunSupabaseIntegrationTests(): boolean {
  const missing = getMissingSupabaseIntegrationEnv();

  if (missing.length === 0) {
    return true;
  }

  console.error(
    `[tests/integration] Suite ignoree: variables manquantes (${missing.join(
      ", "
    )})`
  );

  return false;
}

export function createIntegrationSupabaseClients(
  config: IntegrationSupabaseConfig = getIntegrationSupabaseConfig()
): Pick<IntegrationClients, "admin" | "anon"> {
  const options = createClientOptions();

  return {
    admin: createClient(config.url, config.serviceRoleKey, options),

    anon: createClient(config.url, config.anonKey, options),
  };
}

export async function createSupabaseIntegrationClients(): Promise<IntegrationClients> {
  const config = getIntegrationSupabaseConfig();
  const options = createClientOptions();

  const admin = createClient(config.url, config.serviceRoleKey, options);

  const anon = createClient(config.url, config.anonKey, options);

  const uniqueId = createTestRunId("user");
  const userEmail = `${uniqueId}@smart-fleet.local`;
  const userPassword = `Integration-${uniqueId}-A1!`;

  const { data: createdUserData, error: createUserError } =
    await admin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        source: "integration-test",
        test_run_id: uniqueId,
      },
    });

  if (createUserError) {
    throw new Error(
      `[integration auth] création utilisateur impossible : ${createUserError.message}`
    );
  }

  const userId = createdUserData.user?.id;

  if (!userId) {
    throw new Error(
      "[integration auth] la création de l’utilisateur n’a retourné aucun identifiant"
    );
  }

  const { error: profileError } = await admin.from("profils").upsert(
    {
      user_id: userId,
      full_name: "Integration Test User",
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);

    throw new Error(
      `[integration auth] crÃ©ation profil utilisateur impossible : ${profileError.message}`
    );
  }

  const user = createClient(config.url, config.anonKey, options);

  const { data: signInData, error: signInError } =
    await user.auth.signInWithPassword({
      email: userEmail,
      password: userPassword,
    });

  if (signInError) {
    await admin.auth.admin.deleteUser(userId);

    throw new Error(
      `[integration auth] connexion utilisateur impossible : ${signInError.message}`
    );
  }

  if (!signInData.session) {
    await admin.auth.admin.deleteUser(userId);

    throw new Error(
      "[integration auth] aucune session retournée après la connexion"
    );
  }

  return {
    admin,
    user,
    anon,
    userId,
    userEmail,
  };
}
