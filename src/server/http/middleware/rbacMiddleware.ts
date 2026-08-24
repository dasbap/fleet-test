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
import { throwIfSupabaseInfrastructureError } from "../../../lib/supabase-runtime-errors.js";
import { getBearerToken } from "../auth.js";
import { createSupabaseServiceClient } from "../../infra/supabaseServiceClient.js";
import { createSupabaseUserClient } from "../../infra/supabaseUserClient.js";
import type { Permission, PlatformRole } from "../../../types/rbac.js";

const ROLE_HIERARCHY: readonly PlatformRole[] = [
  "admin",
  "organizer",
  "manager",
  "mechanic",
  "driver",
];

function isPlatformAdminInternalRole(value: unknown): boolean {
  return value === "super_admin" || value === "admin";
}

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

async function checkPermissionRpc(
  token: string,
  permission: Permission,
  fleetId?: string,
): Promise<{ allowed: boolean; role: string | null } | null> {
  const userClient = createSupabaseUserClient(token);
  const { data, error } = await userClient.rpc("rbac_check_permission", {
    p_action: permission,
    p_fleet_id: fleetId ?? null,
  });

  if (error) {
    console.error("[rbacMiddleware] rbac_check_permission error:", error.message);
    throwIfSupabaseInfrastructureError(error, "rbac permission RPC");
    return null;
  }

  return data as { allowed: boolean; role: string | null } | null;
}

async function resolvePlatformRole(
  userId: string,
  fleetId?: string,
): Promise<PlatformRole | null> {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing for RBAC role lookup");

  const { data: adminProfile, error: adminProfileError } = await admin
    .from("admin_profiles")
    .select("id, is_active, internal_role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (adminProfileError) {
    throwIfSupabaseInfrastructureError(adminProfileError, "rbac admin profile lookup");
    return null;
  }

  if (adminProfile && isPlatformAdminInternalRole(adminProfile.internal_role)) {
    return "admin";
  }

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

    c.set("rbacRole", result.role);
    c.set("rbacUserId", userId);

    return next();
  };
}

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

export function requireAdmin(): MiddlewareHandler {
  return async (c: Context, next): Promise<Response | void> => {
    const userId = await resolveUserId(c);
    if (!userId) {
      return c.json({ error: "Authentification requise", code: "UNAUTHENTICATED" }, 401);
    }

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
      .select("id, is_active, internal_role")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (adminProfileError) {
      throwIfSupabaseInfrastructureError(adminProfileError, "rbac require admin lookup");
      return c.json({ error: "Configuration serveur incorrecte" }, 500);
    }

    if (!adminProfile || !isPlatformAdminInternalRole(adminProfile.internal_role)) {
      return c.json({ error: "Accès admin refusé", code: "NOT_PLATFORM_ADMIN" }, 403);
    }

    c.set("rbacRole", "admin");
    c.set("rbacUserId", userId);

    return next();
  };
}

export interface RbacHonoVars {
  rbacRole:    PlatformRole;
  rbacUserId:  string;
  rbacFleetId: string | undefined;
}
