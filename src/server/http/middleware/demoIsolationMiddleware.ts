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
import { getBearerToken } from "@/server/http/auth";
import { createSupabaseServiceClient } from "@/server/infra/supabaseServiceClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserKind = "real" | "demo" | "prospect" | "admin" | "unknown";

interface IsolationContext {
  userId:   string;
  userKind: UserKind;
  isDemo:   boolean;
}

// ─── Cache in-memory (court terme, évite N requêtes par request) ──────────────
// TTL 60s — le statut démo/prospect ne change pas fréquemment.

const USER_KIND_CACHE = new Map<string, { kind: UserKind; ts: number }>();
const CACHE_TTL_MS = 60_000;

async function resolveUserKind(userId: string): Promise<UserKind> {
  const cached = USER_KIND_CACHE.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.kind;
  }

  const admin = createSupabaseServiceClient();
  if (!admin) return "unknown";

  // Vérifier admin plateforme
  const { data: adminRow } = await admin
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (adminRow) {
    USER_KIND_CACHE.set(userId, { kind: "admin", ts: Date.now() });
    return "admin";
  }

  // Vérifier démo/prospect
  const { data: demoRow } = await admin
    .from("demo_profiles")
    .select("user_id, account_type, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (demoRow) {
    const kind: UserKind =
      (demoRow as { account_type: string }).account_type === "prospect"
        ? "prospect"
        : "demo";
    USER_KIND_CACHE.set(userId, { kind, ts: Date.now() });
    return kind;
  }

  // Utilisateur réel
  USER_KIND_CACHE.set(userId, { kind: "real", ts: Date.now() });
  return "real";
}

async function isFleetDemo(fleetId: string): Promise<boolean | null> {
  const admin = createSupabaseServiceClient();
  if (!admin) return null;

  const { data } = await admin
    .from("flottes")
    .select("is_demo")
    .eq("id", fleetId)
    .maybeSingle();

  if (!data) return null;
  return (data as { is_demo: boolean }).is_demo ?? false;
}

async function resolveUserId(c: Context): Promise<string | null> {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) return null;

  const admin = createSupabaseServiceClient();
  if (!admin) return null;

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

// ─── Middleware principal : demoIsolationMiddleware ───────────────────────────

/**
 * Vérifie que l'utilisateur n'accède qu'aux données correspondant à son type.
 * Utilise le `fleet_id` extrait par `fleetIdFn`.
 *
 * Si aucun fleet_id n'est détecté, laisse passer (la route n'est pas fleet-scoped).
 *
 * @example
 * app.get("/vehicles",
 *   demoIsolationMiddleware((c) => c.req.query("fleet_id")),
 *   handler,
 * );
 */
export function demoIsolationMiddleware(
  fleetIdFn?: (c: Context) => string | undefined,
): MiddlewareHandler {
  return async (c: Context, next): Promise<Response | void> => {
    const userId = await resolveUserId(c);
    if (!userId) return next(); // Pas authentifié → l'auth middleware gère

    const userKind = await resolveUserKind(userId);

    // Attacher pour les handlers en aval
    c.set("isolationUserKind", userKind);
    c.set("isolationUserId",   userId);

    // Admin : audit seulement — peut lire mais ne devrait pas écrire sur démo via BFF
    if (userKind === "admin") return next();

    // Extraire le fleet_id de la requête
    const fleetId = fleetIdFn ? fleetIdFn(c) : undefined;
    if (!fleetId) return next(); // Pas de fleet_id → pas d'isolation applicable ici

    const fleetIsDemo = await isFleetDemo(fleetId);
    if (fleetIsDemo === null) {
      // Flotte introuvable → laisser passer (la route gèrera le 404)
      return next();
    }

    const userIsDemo = userKind === "demo" || userKind === "prospect";

    // Isolation : démo ↔ réel ne peuvent pas se croiser
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

// ─── requireRealUser ─────────────────────────────────────────────────────────

/**
 * Bloque toute requête provenant d'un compte démo ou prospect.
 * Pour les routes de facturation, export massif, administration.
 *
 * @example
 * app.post("/billing/subscribe", requireRealUser(), handler);
 */
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

// ─── requireDemoUser ─────────────────────────────────────────────────────────

/**
 * Réservé aux comptes démo/prospect (ex: fleet reset, session démo).
 * Bloque les comptes réels.
 *
 * @example
 * app.post("/demo/reset-fleet", requireDemoUser(), handler);
 */
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

// ─── verifyFleetIsolation (helper dans un handler) ────────────────────────────

/**
 * Vérification ponctuelle dans un handler Hono (pas un middleware).
 * Retourne null si OK, ou une Response 403 si violation.
 *
 * @example
 * const violation = await verifyFleetIsolation(c, vehicle.fleet_id);
 * if (violation) return violation;
 */
export async function verifyFleetIsolation(
  c: Context,
  fleetId: string,
): Promise<Response | null> {
  const userKind = c.get("isolationUserKind") as UserKind | undefined;
  const userId   = c.get("isolationUserId")   as string    | undefined;

  // Si le middleware n'a pas encore été exécuté, résoudre maintenant
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

// ─── Invalidation cache (utile après changement de statut) ───────────────────

/** Force la revalidation du kind pour un user (ex: après conversion prospect → réel). */
export function invalidateIsolationCache(userId: string): void {
  USER_KIND_CACHE.delete(userId);
}
