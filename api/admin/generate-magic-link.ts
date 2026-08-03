/**
 * BFF Vercel : /api/admin/generate-magic-link
 *
 * Génère un nouveau magic link pour un compte démo existant.
 * ADMIN_SECRET n'est jamais transmis au navigateur.
 *
 * Sécurité :
 *   1. Vérifie JWT Supabase + is_platform_admin()
 *   2. Transmet à demo-magic-link Edge Function avec ADMIN_SECRET serveur
 *
 * Variables Vercel :
 *   - ADMIN_SECRET
 *   - SUPABASE_URL
 *   - SUPABASE_ANON_KEY
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const ANON_KEY     = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", process.env.VITE_APP_URL ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const userToken = (req.headers.authorization ?? "").replace(/^Bearer /, "").trim();

  if (!userToken || !SUPABASE_URL || !ANON_KEY) {
    res.status(401).json({ ok: false, error: "missing_auth" });
    return;
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
    auth:   { persistSession: false },
  });

  const { data: { user }, error: authErr } = await userClient.auth.getUser(userToken);
  if (authErr || !user) {
    res.status(401).json({ ok: false, error: "invalid_token" });
    return;
  }

  const { data: isAdminUser } = await userClient.rpc("is_platform_admin");
  if (!isAdminUser) {
    res.status(403).json({ ok: false, error: "forbidden_not_platform_admin" });
    return;
  }

  // ── Validation body ───────────────────────────────────────────────────────
  const body = req.body as {
    user_id?:  string;
    fleet_id?: string;
    email?:    string;
    label?:    string;
  };

  if (!body?.user_id || !body?.email) {
    res.status(400).json({ ok: false, error: "missing_fields: user_id, email requis" });
    return;
  }

  if (!ADMIN_SECRET) {
    res.status(500).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  // ── Forward vers Edge Function ────────────────────────────────────────────
  try {
    const upstream = await fetch(`${SUPABASE_URL}/functions/v1/demo-magic-link`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        action:   "create",
        user_id:  body.user_id,
        fleet_id: body.fleet_id ?? null,
        email:    body.email,
        label:    body.label,
      }),
    });

    const data = await upstream.json() as Record<string, unknown>;

    if (upstream.status === 429) { res.status(429).json(data); return; }
    if (!upstream.ok) { res.status(upstream.status).json(data); return; }

    console.log(`[bff/generate-magic-link] Succès — admin: ${user.id}`);
    res.status(200).json(data);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
}
