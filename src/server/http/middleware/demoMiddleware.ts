/**
 * Middleware Hono — guard comptes démo E-Samba.
 *
 * À appliquer APRÈS le middleware d'authentification, sur toutes les routes
 * qui manipulent des ressources sensibles (billing, exports, admin).
 *
 * Comportement :
 *   - Utilisateur non-démo → laisse passer sans contrôle
 *   - Utilisateur démo + session expirée → 401
 *   - Utilisateur démo + route bloquée → 403 + audit log
 *   - Utilisateur démo + route autorisée → attache demoContext à la requête, continue
 */

import type { Context, MiddlewareHandler } from "hono";
import { createClient } from "@supabase/supabase-js";
import { isDemoBffRouteBlocked } from "../../../lib/demo/demoGuard.js";

// ─── Types ─────────────────────────────────────────────────────────────────

interface DemoProfile {
  user_id:   string;
  demo_role: string;
  fleet_id:  string;
  is_active: boolean;
}

interface DemoSessionRow {
  id:           string;
  user_id:      string;
  expires_at:   string;
  is_active:    boolean;
}

// ─── Client admin (service_role) ───────────────────────────────────────────
// Utilisé uniquement pour lire demo_profiles et demo_sessions (RLS bypassé).

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans l'env BFF");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// ─── Audit log helper ──────────────────────────────────────────────────────

async function auditLog(
  admin: ReturnType<typeof getAdminClient>,
  userId:    string,
  sessionId: string | null,
  action:    string,
  resource:  string,
  status:    "allowed" | "blocked" | "expired" | "error",
  metadata:  Record<string, unknown> = {},
): Promise<void> {
  await admin.from("demo_audit_logs").insert({
    user_id:    userId,
    session_id: sessionId,
    action,
    resource,
    status,
    metadata,
  });
}

// ─── Middleware ─────────────────────────────────────────────────────────────

export const demoMiddleware: MiddlewareHandler = async (
  c: Context,
  next,
): Promise<Response | void> => {
  // Récupérer l'utilisateur depuis le token Bearer
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return next(); // pas de token → géré par l'auth middleware en amont
  }

  const token = authHeader.slice(7);

  let admin: ReturnType<typeof getAdminClient>;
  try {
    admin = getAdminClient();
  } catch (err) {
    console.error("[demoMiddleware] Configuration serveur manquante:", err);
    return c.json({ error: "Configuration serveur incorrecte" }, 500);
  }

  // Vérifier l'utilisateur
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) {
    return next(); // token invalide → l'auth middleware gère l'erreur
  }

  // Vérifier si c'est un compte démo
  const { data: profile } = await admin
    .from("demo_profiles")
    .select("user_id, demo_role, fleet_id, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single<DemoProfile>();

  if (!profile) {
    return next(); // utilisateur réel → aucune restriction
  }

  // ── Vérifier session active ──────────────────────────────────────────────

  const { data: session } = await admin
    .from("demo_sessions")
    .select("id, user_id, expires_at, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .single<DemoSessionRow>();

  if (!session) {
    await auditLog(admin, user.id, null, "blocked_expired_session", c.req.path, "expired", {
      path: c.req.path,
      method: c.req.method,
    });
    return c.json({ error: "Session démo expirée. Reconnectez-vous pour démarrer une nouvelle session." }, 401);
  }

  // ── Vérifier routes bloquées ─────────────────────────────────────────────

  const pathname = new URL(c.req.url).pathname;

  if (isDemoBffRouteBlocked(pathname)) {
    await auditLog(admin, user.id, session.id, "blocked_route", pathname, "blocked", {
      path:   pathname,
      method: c.req.method,
      role:   profile.demo_role,
    });

    return c.json(
      {
        error:   "Action non disponible en mode démo",
        code:    "DEMO_ROUTE_BLOCKED",
        path:    pathname,
      },
      403,
    );
  }

  // ── Mise à jour heartbeat ────────────────────────────────────────────────

  await admin
    .from("demo_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session.id);

  // ── Attacher le contexte démo à la requête ───────────────────────────────
  // Les handlers en aval peuvent lire c.get("demoProfile") pour adapter leur comportement.

  c.set("demoProfile", profile);
  c.set("demoSession", session);

  return next();
};

// ─── Helper : vérifier action démo depuis un handler ───────────────────────

/**
 * Dans un handler Hono, vérifie si l'action est autorisée pour un compte démo.
 * Si l'utilisateur n'est pas un compte démo, retourne toujours `true`.
 *
 * Exemple :
 *   if (!checkDemoAction(c, 'export_data')) {
 *     return c.json({ error: 'Non disponible en mode démo' }, 403);
 *   }
 */
export async function checkDemoAction(
  c: Context,
  action: "create_vehicle" | "export_data" | "view_billing" | "invite_users" | "access_reports" | "modify_org",
): Promise<boolean> {
  const profile = c.get("demoProfile") as DemoProfile | undefined;
  if (!profile) return true; // non-démo, autorisé

  let admin: ReturnType<typeof getAdminClient>;
  try {
    admin = getAdminClient();
  } catch {
    return false;
  }

  const { data } = await admin.rpc("demo_check_allowed", { p_action: action });
  return (data as { allowed: boolean } | null)?.allowed ?? false;
}
