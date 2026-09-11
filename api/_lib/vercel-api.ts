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

function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: stripTrailingSlashes(readEnv("SUPABASE_URL", "VITE_SUPABASE_URL")),
    anonKey: readEnv("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"),
    serviceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
    adminSecret: readEnv("ADMIN_SECRET"),
    appUrl: stripTrailingSlashes(
      readEnv("VITE_APP_URL", "APP_URL") || "https://www.e-samba.com",
    ),
  };
}

export async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1] = {},
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function isFetchTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function getRequestOrigin(req: VercelRequest): string {
  const origin = req.headers.origin;
  if (Array.isArray(origin)) return origin[0]?.trim() ?? "";
  return typeof origin === "string" ? origin.trim() : "";
}

export function applyCors(req: VercelRequest, res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", resolveAllowedCorsOrigin(getRequestOrigin(req)));
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function isAllowedLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
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

  if (allowLocalDevelopmentOrigins && isAllowedLocalOrigin(requestOrigin)) {
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

const DEFAULT_SUPABASE_TIMEOUT_MS = 5_000;

function boundedSupabaseFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  return fetchWithTimeout(input, init, DEFAULT_SUPABASE_TIMEOUT_MS);
}

export function createUserClient(
  env: SupabaseEnv,
  accessToken: string
): SupabaseClient {
  return createClient(env.url, env.anonKey, {
    global: {
      fetch: boundedSupabaseFetch,
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
    global: {
      fetch: boundedSupabaseFetch,
    },
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
