/**
 * BFF Vercel : /api/admin/create-prospect
 *
 * Intermédiaire sécurisé entre le frontend admin et l'Edge Function
 * create-prospect-account. ADMIN_SECRET n'est jamais transmis au navigateur.
 *
 * Sécurité :
 *   1. Vérifie le JWT Supabase de l'utilisateur (Authorization: Bearer <access_token>)
 *   2. Vérifie que l'utilisateur est admin plateforme (is_platform_admin() RPC)
 *   3. Transmet la requête à l'Edge Function avec ADMIN_SECRET côté serveur
 *
 * Variables Vercel (serveur uniquement — pas de préfixe VITE_) :
 *   - ADMIN_SECRET
 *   - SUPABASE_URL  (ou VITE_SUPABASE_URL en fallback)
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - SUPABASE_ANON_KEY
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const ADMIN_SECRET     = process.env.ADMIN_SECRET ?? "";
const SUPABASE_URL     = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY         = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // CORS preflight
  res.setHeader("Access-Control-Allow-Origin", process.env.VITE_APP_URL ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  // ── 1. Extraire le JWT de l'utilisateur ──────────────────────────────────
  const authHeader = req.headers.authorization ?? "";
  const userToken  = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!userToken) {
    res.status(401).json({ ok: false, error: "missing_auth_token" });
    return;
  }

  if (!SUPABASE_URL || !ANON_KEY) {
    console.error("[bff/create-prospect] Configuration manquante");
    res.status(500).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  // ── 2. Vérifier le JWT + is_platform_admin() ─────────────────────────────
  // Client avec le token user (pour respecter les RLS/permissions)
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
    auth:   { persistSession: false },
  });

  const { data: { user }, error: authErr } = await userClient.auth.getUser(userToken);

  if (authErr || !user) {
    res.status(401).json({ ok: false, error: "invalid_token" });
    return;
  }

  // Vérification admin via service client (contourne RLS pour la vérification)
  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: isAdmin, error: adminErr } = await serviceClient
    .rpc("is_platform_admin")
    .single();

  // is_platform_admin() utilise auth.uid() → doit être appelé avec le bon JWT
  // On utilise un client user pour l'appel RPC
  const [{ data: isAdminUser }, { data: isSuperAdminUser }] = await Promise.all([
    userClient.rpc("is_platform_admin"),
    userClient.rpc("is_platform_super_admin"),
  ]);

  if (adminErr || !isAdminUser) {
    console.warn(`[bff/create-prospect] Accès refusé pour user ${user.id}`);
    res.status(403).json({ ok: false, error: "forbidden_not_platform_admin" });
    return;
  }

  // ── 3. Valider le corps de la requête ────────────────────────────────────
  const body = req.body as {
    email?:        string;
    company_name?: string;
    account_type?: string;
    fleet_id?:     string;
    trial_days?:   number;
    send_email?:   boolean;
    permanent_access?: boolean;
  };

  if (!body?.email || !body.email.includes("@")) {
    res.status(400).json({ ok: false, error: "invalid_email" });
    return;
  }

  if (body.permanent_access && !isSuperAdminUser) {
    res.status(403).json({ ok: false, error: "forbidden_super_admin_required" });
    return;
  }

  // ── 4. Transmettre à l'Edge Function avec ADMIN_SECRET serveur ───────────
  if (!ADMIN_SECRET) {
    console.error("[bff/create-prospect] ADMIN_SECRET non configuré côté serveur");
    res.status(500).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  const edgeFnUrl = `${SUPABASE_URL}/functions/v1/create-prospect-account`;

  try {
    const upstream = await fetch(edgeFnUrl, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        email:        body.email,
        company_name: body.company_name,
        account_type: body.account_type ?? "prospect",
        fleet_id:     null,
        trial_days:   body.trial_days ?? 31,
        send_email:   body.send_email ?? false,
        permanent_access: body.permanent_access === true,
        invited_by:   user.id,  // ID de l'admin qui crée le compte
      }),
    });

    const data = await upstream.json() as Record<string, unknown>;

    if (upstream.status === 429) {
      res.status(429).json(data);
      return;
    }

    if (!upstream.ok) {
      console.error("[bff/create-prospect] Edge Function error:", data);
      res.status(upstream.status).json(data);
      return;
    }

    console.log(`[bff/create-prospect] Succès — admin: ${user.id}, email: ${body.email}`);
    res.status(201).json(data);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[bff/create-prospect] fetch error:", message);
    res.status(500).json({ ok: false, error: message });
  }

  // Supprimer la variable non utilisée
  void isAdmin;
}
