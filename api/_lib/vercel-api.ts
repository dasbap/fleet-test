import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

export interface SupabaseEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  adminSecret: string;
  appUrl: string;
}

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
    anonKey:
      process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    adminSecret: process.env.ADMIN_SECRET ?? "",
    appUrl:
      process.env.VITE_APP_URL ??
      process.env.APP_URL ??
      "https://www.e-samba.com",
  };
}

export function applyCors(res: VercelResponse, origin = "*"): void {
  res.setHeader("Access-Control-Allow-Origin", resolveAllowedCorsOrigin(origin));
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
}

function resolveAllowedCorsOrigin(origin: string): string {
  const configuredAppUrl =
    process.env.VITE_APP_URL ?? process.env.APP_URL ?? "https://www.e-samba.com";
  const fallbackOrigin = configuredAppUrl.replace(/\/$/, "");
  const requestOrigin = origin.replace(/\/$/, "");
  const allowedOrigins = new Set([
    fallbackOrigin,
    "https://www.e-samba.com",
    "https://app.e-samba.com",
  ]);
  const allowLocalDevelopmentOrigins = process.env.NODE_ENV !== "production";

  if (
    allowLocalDevelopmentOrigins &&
    (requestOrigin.startsWith("http://localhost:") ||
      requestOrigin.startsWith("http://127.0.0.1:"))
  ) {
    return requestOrigin;
  }

  return allowedOrigins.has(requestOrigin) ? requestOrigin : fallbackOrigin;
}

export function handlePreflight(
  req: VercelRequest,
  res: VercelResponse
): boolean {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }

  return false;
}

export function extractBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization ?? "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice(7).trim();

  return token.length > 0 ? token : null;
}

export function createUserClient(
  env: SupabaseEnv,
  accessToken: string
): SupabaseClient {
  return createClient(env.url, env.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createAdminClient(env: SupabaseEnv): SupabaseClient {
  if (!env.url || !env.serviceRoleKey) {
    throw new Error("missing_supabase_admin_configuration");
  }

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireAuthenticatedUser(
  req: VercelRequest,
  res: VercelResponse
): Promise<{
  env: SupabaseEnv;
  user: User;
  client: SupabaseClient;
} | null> {
  const env = getSupabaseEnv();
  const token = extractBearerToken(req);

  if (!token || !env.url || !env.anonKey) {
    res.status(401).json({
      ok: false,
      error: "missing_auth_token",
    });

    return null;
  }

  const client = createUserClient(env, token);

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({
      ok: false,
      error: "invalid_token",
    });

    return null;
  }

  return {
    env,
    user,
    client,
  };
}

export async function requirePlatformAdmin(
  req: VercelRequest,
  res: VercelResponse
): Promise<{
  env: SupabaseEnv;
  user: User;
  client: SupabaseClient;
} | null> {
  const auth = await requireAuthenticatedUser(req, res);

  if (!auth) {
    return null;
  }

  const { data: isAdmin, error } = await auth.client.rpc("is_platform_admin");

  if (error || !isAdmin) {
    res.status(403).json({
      ok: false,
      error: "forbidden_not_platform_admin",
    });

    return null;
  }

  return auth;
}
