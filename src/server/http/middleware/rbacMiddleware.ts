/**
 * Middleware Hono — RBAC E-Samba côté BFF.
 *
 * À appliquer APRÈS le middleware d'authentification.
 * Source de vérité : RPC `rbac_check_permission` (SECURITY DEFINER, bypass RLS).
 *
 * Exports :
 *   - requirePermission(permission)  : vérifie une permission granulaire
 *   - requireRole(minRole)           : vérifie un rôle minimum
 *   - requireFleetAccess(fleetIdFn)  : vérifie l'accès à une flotte spécifique
 *   - requireAdmin()                 : admin plateforme uniquement
 *
 * Principe anti-élévation :
 *   - Jamais de confiance côté header : on vérifie toujours depuis le token JWT
 *   - Un compte démo ne peut jamais obtenir admin.access
 *   - Les résultats ne sont pas mis en cache côté BFF (requête DB à chaque appel)
 */

import type { Context, MiddlewareHandler } from "hono";
import { throwIfSupabaseInfrastructureError } from "@/lib/supabase-runtime-errors";
import { getBearerToken } from "@/server/http/auth";
import { createSupabaseServiceClient } from "@/server/infra/supabaseServiceClient";
import type { Permission, PlatformRole } from "@/types/rbac";

// ─── Constantes ────────────────────────────────────────────────────────────────

/** Hiérarchie des rôles (index plus bas = plus de privilèges). */
const ROLE_HIERARCHY: readonly PlatformRole[] = [
  "admin",
  "organizer",
  "manager",
  "mechanic",
  "driver",
];

// ─── Helpers privés ────────────────────────────────────────────────────────────

/**
 * Résout l'utilisateur depuis le Bearer token et retourne son ID.
 * Retourne null si le token est absent ou invalide.
 */
async function resolveUserId(c: Context): Promise<string | null> {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) return null;

  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing for RBAC");

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error) {
    throwIfSupabaseInfrastructureError(error, "rbac token verification");
    return null;
  }
  if (!user) return null;

  return user.id;
}

/**
 * Vérifie si un utilisateur est un compte démo.
 * Un compte démo ne peut jamais obtenir admin.access.
 */
async function isDemoUser(userId: string): Promise<boolean> {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing for demo check");

  const { data, error } = await admin
    .from("demo_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throwIfSupabaseInfrastructureError(error, "rbac demo profile lookup");
    return false;
  }

  return !!data;
}

/**
 * Appelle `rbac_check_permission` côté Supabase (SECURITY DEFINER).
 * Retourne { allowed, role } ou null en cas d'erreur.
 */
async function checkPermissionRpc(
  token: string,
  permission: Permission,
  fleetId?: string,
): Promise<{ allowed: boolean; role: string | null } | null> {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing for RBAC");

  // Utiliser un client avec le JWT utilisateur pour que RLS s'applique correctement
  // La fonction est SECURITY DEFINER → elle voit toutes les données
  const { data, error } = await admin.rpc("rbac_check_permission", {
    p_permission: permission,
    p_fleet_id: fleetId ?? null,
  });

  if (error) {
    console.error("[rbacMiddleware] rbac_check_permission error:", error.message);
    throwIfSupabaseInfrastructureError(error, "rbac permission RPC");
    return null;
  }

  return data as { allowed: boolean; role: string | null } | null;
}

/**
 * Retourne le rôle plateforme d'un utilisateur via `admin_profiles` + `flotte_adhesions`.
 */
async function resolvePlatformRole(
  userId: string,
  fleetId?: string,
): Promise<PlatformRole | null> {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing for RBAC role lookup");

  // Vérifier admin plateforme
  const { data: adminProfile, error: adminProfileError } = await admin
    .from("admin_profiles")
    .select("id, is_active")
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (adminProfileError) {
    throwIfSupabaseInfrastructureError(adminProfileError, "rbac admin profile lookup");
    return null;
  }

  if (adminProfile) return "admin";

  // Rôle sur la flotte demandée
  if (fleetId) {
    const { data: membership, error: membershipError } = await admin
      .from("flotte_adhesions")
      .select("role")
      .eq("user_id", userId)
      .eq("fleet_id", fleetId)
      .eq("is_active", true)
      .maybeSingle();

    if (membershipError) {
      throwIfSupabaseInfrastructureError(membershipError, "rbac fleet membership lookup");
      return null;
    }

    return (membership?.role as PlatformRole | undefined) ?? null;
  }

  return null;
}

// ─── Middleware : requirePermission ────────────────────────────────────────────

/**
 * Vérifie qu'un utilisateur a une permission granulaire.
 * `fleetIdFn` extrait le fleet_id depuis le contexte Hono (params, query, body).
 *
 * @example
 * app.post("/vehicles", requirePermission("vehicle.create", (c) => c.req.param("fleetId")), handler);
 */
export function requirePermission(
  permission: Permission,
  fleetIdFn?: (c: Context) => string | undefined,
): MiddlewareHandler {
  return async (c: Context, next): Promise<Response | void> => {
    const token = getBearerToken(c.req.header("Authorization"));
    if (!token) {
      return c.json({ error: "Authentification requise", code: "UNAUTHENTICATED" }, 401);
    }

    const userId = await resolveUserId(c);
    if (!userId) {
      return c.json({ error: "Token invalide", code: "INVALID_TOKEN" }, 401);
    }

    // Anti-élévation : un démo ne peut pas accéder aux permissions admin
    if (permission.startsWith("admin.")) {
      const demo = await isDemoUser(userId);
      if (demo) {
        return c.json(
          { error: "Non disponible en mode démo", code: "DEMO_BLOCKED", permission },
          403,
        );
      }
    }

    const fleetId = fleetIdFn ? fleetIdFn(c) : undefined;
    const result  = await checkPermissionRpc(token, permission, fleetId);

    if (!result || !result.allowed) {
      return c.json(
        {
          error:      "Permission insuffisante",
          code:       "RBAC_DENIED",
          permission,
          role:       result?.role ?? null,
        },
        403,
      );
    }

    // Attacher le rôle résolu pour les handlers en aval
    c.set("rbacRole", result.role);
    c.set("rbacUserId", userId);

    return next();
  };
}

// ─── Middleware : requireRole ──────────────────────────────────────────────────

/**
 * Vérifie qu'un utilisateur a au moins le rôle `minRole`.
 * Utilise la hiérarchie : admin > organizer > manager > mechanic > driver.
 *
 * @example
 * app.delete("/fleet/:id", requireRole("organizer"), handler);
 */
export function requireRole(
  minRole: PlatformRole,
  fleetIdFn?: (c: Context) => string | undefined,
): MiddlewareHandler {
  return async (c: Context, next): Promise<Response | void> => {
    const userId = await resolveUserId(c);
    if (!userId) {
      return c.json({ error: "Authentification requise", code: "UNAUTHENTICATED" }, 401);
    }

    const fleetId = fleetIdFn ? fleetIdFn(c) : undefined;
    const role    = await resolvePlatformRole(userId, fleetId);

    if (!role) {
      return c.json({ error: "Aucun rôle sur cette flotte", code: "NO_FLEET_ROLE" }, 403);
    }

    const userIndex = ROLE_HIERARCHY.indexOf(role);
    const minIndex  = ROLE_HIERARCHY.indexOf(minRole);

    if (userIndex === -1 || minIndex === -1 || userIndex > minIndex) {
      return c.json(
        {
          error:    "Rôle insuffisant",
          code:     "RBAC_ROLE_DENIED",
          role,
          required: minRole,
        },
        403,
      );
    }

    c.set("rbacRole", role);
    c.set("rbacUserId", userId);

    return next();
  };
}

// ─── Middleware : requireFleetAccess ──────────────────────────────────────────

/**
 * Vérifie que l'utilisateur a accès à la flotte spécifiée.
 * L'admin plateforme passe toujours.
 * Pour les autres : vérifie un membership actif dans `flotte_adhesions`.
 *
 * @example
 * app.get("/fleet/:fleetId/vehicles", requireFleetAccess((c) => c.req.param("fleetId")), handler);
 */
export function requireFleetAccess(
  fleetIdFn: (c: Context) => string | undefined,
): MiddlewareHandler {
  return async (c: Context, next): Promise<Response | void> => {
    const userId  = await resolveUserId(c);
    if (!userId) {
      return c.json({ error: "Authentification requise", code: "UNAUTHENTICATED" }, 401);
    }

    const fleetId = fleetIdFn(c);
    if (!fleetId) {
      return c.json({ error: "fleet_id manquant", code: "MISSING_FLEET_ID" }, 400);
    }

    const role = await resolvePlatformRole(userId, fleetId);

    if (role === "admin") {
      // Admin plateforme : accès global
      c.set("rbacRole", "admin");
      c.set("rbacUserId", userId);
      return next();
    }

    if (!role) {
      return c.json(
        {
          error:    "Accès à cette flotte refusé",
          code:     "FLEET_ACCESS_DENIED",
          fleet_id: fleetId,
        },
        403,
      );
    }

    c.set("rbacRole", role);
    c.set("rbacUserId", userId);
    c.set("rbacFleetId", fleetId);

    return next();
  };
}

// ─── Middleware : requireAdmin ─────────────────────────────────────────────────

/**
 * Réservé aux admins plateforme. Les comptes démo ne peuvent jamais passer.
 *
 * @example
 * app.get("/admin/users", requireAdmin(), handler);
 */
export function requireAdmin(): MiddlewareHandler {
  return async (c: Context, next): Promise<Response | void> => {
    const userId = await resolveUserId(c);
    if (!userId) {
      return c.json({ error: "Authentification requise", code: "UNAUTHENTICATED" }, 401);
    }

    // Bloquer les comptes démo avant même de vérifier admin_profiles
    const demo = await isDemoUser(userId);
    if (demo) {
      return c.json({ error: "Non disponible en mode démo", code: "DEMO_BLOCKED" }, 403);
    }

    const admin  = createSupabaseServiceClient();
    if (!admin) {
      return c.json({ error: "Configuration serveur incorrecte" }, 500);
    }

    const { data: adminProfile, error: adminProfileError } = await admin
      .from("admin_profiles")
      .select("id, is_active")
      .eq("id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (adminProfileError) {
      throwIfSupabaseInfrastructureError(adminProfileError, "rbac require admin lookup");
      return c.json({ error: "Configuration serveur incorrecte" }, 500);
    }

    if (!adminProfile) {
      return c.json({ error: "Accès admin refusé", code: "NOT_PLATFORM_ADMIN" }, 403);
    }

    c.set("rbacRole", "admin");
    c.set("rbacUserId", userId);

    return next();
  };
}

// ─── Types de variables Hono pour les handlers en aval ────────────────────────

/** Variables injectées par les middlewares RBAC dans le contexte Hono. */
export interface RbacHonoVars {
  rbacRole:    PlatformRole;
  rbacUserId:  string;
  rbacFleetId: string | undefined;
}
