/**
 * Middleware Hono — Isolation stricte données démo E-Samba.
 *
 * Règles :
 *   - Utilisateur démo/prospect  → uniquement ressources is_demo = true
 *   - Utilisateur réel           → jamais ressources is_demo = true
 *   - Admin plateforme           → accès audit complet (lecture uniquement depuis démo)
 *
 * À appliquer sur les routes manipulant fleet_id, org_id, vehicle_id.
 *
 * Exports :
 *   - demoIsolationMiddleware   : vérification automatique fleet is_demo vs user type
 *   - requireRealUser()         : bloque les comptes démo/prospect
 *   - requireDemoUser()         : réservé aux comptes démo (fleet reset, etc.)
 *   - verifyFleetIsolation()    : helper ponctuel dans un handler
 */

import type { Context, MiddlewareHandler } from "hono";
import { throwIfSupabaseInfrastructureError } from "../../../lib/supabase-runtime-errors.js";
import { getBearerToken } from "../auth.js";
import { createSupabaseServiceClient } from "../../infra/supabaseServiceClient.js";

type UserKind = "real" | "demo" | "prospect" | "admin" | "unknown";

interface IsolationContext {
  userId:   string;
  userKind: UserKind;
  isDemo:   boolean;
}

const USER_KIND_CACHE = new Map<string, { kind: UserKind; ts: number }>();
const CACHE_TTL_MS = 60_000;

function isPlatformAdminInternalRole(value: unknown): boolean {
  return value === "super_admin" || value === "admin";
}

async function resolveUserKind(userId: string): Promise<UserKind> {
  const cached = USER_KIND_CACHE.get(userId);
  if (cached && cached.kind !== "admin" && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.kind;
  }

  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing for demo isolation");

  const { data: adminRow, error: adminError } = await admin
    .from("admin_profiles")
    .select("user_id, internal_role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (adminError) {
    throwIfSupabaseInfrastructureError(adminError, "demo isolation admin lookup");
  }

  if (adminRow && isPlatformAdminInternalRole(adminRow.internal_role)) {
    return "admin";
  }

  const { data: demoRow, error: demoError } = await admin
    .from("demo_profiles")
    .select("user_id, account_type, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (demoError) {
    throwIfSupabaseInfrastructureError(demoError, "demo isolation profile lookup");
  }

  if (demoRow) {
    const kind: UserKind =
      (demoRow as { account_type: string }).account_type === "prospect"
        ? "prospect"
        : "demo";
    USER_KIND_CACHE.set(userId, { kind, ts: Date.now() });
    return kind;
  }

  USER_KIND_CACHE.set(userId, { kind: "real", ts: Date.now() });
  return "real";
}

async function isFleetDemo(fleetId: string): Promise<boolean | null> {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing for demo isolation");

  const { data, error } = await admin
    .from("flottes")
    .select("is_demo")
    .eq("id", fleetId)
    .maybeSingle();

  if (error) {
    throwIfSupabaseInfrastructureError(error, "demo isolation fleet lookup");
    return null;
  }

  if (!data) return null;
  return (data as { is_demo: boolean }).is_demo ?? false;
}

async function resolveUserId(c: Context): Promise<string | null> {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) return null;

  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing for demo isolation");

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error) {
    throwIfSupabaseInfrastructureError(error, "demo isolation token verification");
    return null;
  }
  if (!user) return null;
  return user.id;
}

export function demoIsolationMiddleware(
  fleetIdFn?: (c: Context) => string | undefined,
): MiddlewareHandler {
  return async (c: Context, next): Promise<Response | void> => {
    const userId = await resolveUserId(c);
    if (!userId) return next();

    const userKind = await resolveUserKind(userId);

    c.set("isolationUserKind", userKind);
    c.set("isolationUserId",   userId);

    if (userKind === "admin") return next();

    const fleetId = fleetIdFn ? fleetIdFn(c) : undefined;
    if (!fleetId) return next();

    const fleetIsDemo = await isFleetDemo(fleetId);
    if (fleetIsDemo === null) {
      return next();
    }

    const userIsDemo = userKind === "demo" || userKind === "prospect";

    if (userIsDemo && !fleetIsDemo) {
      return c.json(
        {
          error:    "Accès à une flotte réelle interdit depuis un compte démo",
          code:     "DEMO_ISOLATION_VIOLATION",
          fleet_id: fleetId,
        },
        403,
      );
    }

    if (!userIsDemo && fleetIsDemo) {
      return c.json(
        {
          error:    "Accès à une flotte démo interdit depuis un compte réel",
          code:     "REAL_ISOLATION_VIOLATION",
          fleet_id: fleetId,
        },
        403,
      );
    }

    return next();
  };
}

export function requireRealUser(): MiddlewareHandler {
  return async (c: Context, next): Promise<Response | void> => {
    const userId = await resolveUserId(c);
    if (!userId) {
      return c.json({ error: "Authentification requise", code: "UNAUTHENTICATED" }, 401);
    }

    const kind = await resolveUserKind(userId);

    if (kind === "demo" || kind === "prospect") {
      return c.json(
        {
          error: "Non disponible en mode démo. Créez un compte réel pour accéder à cette fonctionnalité.",
          code:  "DEMO_ACCOUNT_BLOCKED",
          kind,
        },
        403,
      );
    }

    c.set("isolationUserKind", kind);
    c.set("isolationUserId",   userId);
    return next();
  };
}

export function requireDemoUser(): MiddlewareHandler {
  return async (c: Context, next): Promise<Response | void> => {
    const userId = await resolveUserId(c);
    if (!userId) {
      return c.json({ error: "Authentification requise", code: "UNAUTHENTICATED" }, 401);
    }

    const kind = await resolveUserKind(userId);

    if (kind !== "demo" && kind !== "prospect" && kind !== "admin") {
      return c.json(
        { error: "Route réservée aux comptes démo", code: "DEMO_ONLY" },
        403,
      );
    }

    c.set("isolationUserKind", kind);
    c.set("isolationUserId",   userId);
    return next();
  };
}

export async function verifyFleetIsolation(
  c: Context,
  fleetId: string,
): Promise<Response | null> {
  const userKind = c.get("isolationUserKind") as UserKind | undefined;
  const userId   = c.get("isolationUserId")   as string    | undefined;

  const kind = userKind ?? (userId ? await resolveUserKind(userId) : "unknown");

  if (kind === "admin") return null;

  const fleetIsDemo = await isFleetDemo(fleetId);
  if (fleetIsDemo === null) return null;

  const userIsDemo = kind === "demo" || kind === "prospect";

  if (userIsDemo && !fleetIsDemo) {
    return c.json(
      { error: "Isolation démo violée : flotte réelle inaccessible", code: "DEMO_ISOLATION_VIOLATION" },
      403,
    );
  }

  if (!userIsDemo && fleetIsDemo) {
    return c.json(
      { error: "Isolation démo violée : flotte démo inaccessible", code: "REAL_ISOLATION_VIOLATION" },
      403,
    );
  }

  return null;
}

export function invalidateIsolationCache(userId: string): void {
  USER_KIND_CACHE.delete(userId);
}
