/**
 * Edge Function : demo-magic-link
 *
 * Deux actions :
 *
 *   action: "create"
 *     → Nécessite Authorization: Bearer <ADMIN_SECRET> (appelé uniquement depuis BFF Vercel)
 *     → Crée un token UUID en base via demo_create_magic_link()
 *     → Retourne magic_url = APP_URL/demo/access?token=<UUID>
 *     → Rate-limit : 10 créations/heure par token admin (via demo_check_rate_limit)
 *
 *   action: "validate"
 *     → Public (appelé depuis DemoMagicLinkPage côté client)
 *     → Valide le token via demo_validate_magic_link()
 *     → Génère un Supabase Auth magic link (OTP) pour authentifier le prospect
 *     → Rate-limit : 20 tentatives/heure par token UUID (via demo_check_rate_limit)
 *     → Retourne { ok, magic_link } → le client redirige vers magic_link
 *
 * Variables ENV :
 *   - ADMIN_SECRET
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - APP_URL
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_SECRET     = Deno.env.get("ADMIN_SECRET") ?? "";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL          = Deno.env.get("APP_URL") ?? "https://app.e-samba.com";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateBody {
  action:   "create";
  user_id:  string;
  fleet_id: string;
  email:    string;
  label?:   string;
}

interface ValidateBody {
  action: "validate";
  token:  string;
}

type RequestBody = CreateBody | ValidateBody;

interface RateResult {
  ok: boolean;
  error?: string;
  reset_at?: string;
}

interface ValidateResult {
  ok: boolean;
  user_id?: string;
  email?: string;
  fleet_id?: string;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  if (!body.action || !["create", "validate"].includes(body.action)) {
    return json({ ok: false, error: "invalid_action" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION : create
  // ─────────────────────────────────────────────────────────────────────────
  if (body.action === "create") {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!ADMIN_SECRET || token !== ADMIN_SECRET) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    const { user_id, fleet_id, email, label } = body as CreateBody;

    if (!user_id || !fleet_id || !email) {
      return json({ ok: false, error: "missing_fields: user_id, fleet_id, email requis" }, 400);
    }

    // Rate-limit : 10 créations/heure pour ce token admin (hash du token pour la clé)
    const tokenHash = token.slice(0, 8); // Préfixe non-sensible pour la clé
    const { data: rlData } = await admin.rpc("demo_check_rate_limit", {
      p_key:       `create_magic_link:${tokenHash}`,
      p_max_count: 10,
    });

    const rl = rlData as RateResult;
    if (!rl?.ok) {
      console.warn(`[demo-magic-link] Rate limit create: ${rl?.error}`);
      return json({ ok: false, error: "rate_limit_exceeded", reset_at: rl?.reset_at }, 429);
    }

    // Créer le magic link en base
    const { data: linkData, error: linkErr } = await admin.rpc("demo_create_magic_link", {
      p_user_id:  user_id,
      p_fleet_id: fleet_id,
      p_email:    email,
      p_label:    label ?? null,
    });

    if (linkErr || !(linkData as { ok: boolean })?.ok) {
      console.error("[demo-magic-link] demo_create_magic_link error:", linkErr?.message);
      return json({ ok: false, error: linkErr?.message ?? "create_failed" }, 500);
    }

    const link = linkData as { ok: boolean; token: string };
    const magicUrl = `${APP_URL}/demo/access?token=${link.token}`;

    console.log(`[demo-magic-link] Created for ${email} → ${link.token}`);
    return json({ ok: true, magic_url: magicUrl });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION : validate
  // ─────────────────────────────────────────────────────────────────────────
  if (body.action === "validate") {
    const { token } = body as ValidateBody;

    if (!token) {
      return json({ ok: false, error: "token_required" }, 400);
    }

    // Validation UUID format basique (évite injections / requêtes inutiles)
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(token)) {
      return json({ ok: false, error: "token_not_found" }, 404);
    }

    // Rate-limit : 20 tentatives/heure par token (protection brute-force)
    const { data: rlData } = await admin.rpc("demo_check_rate_limit", {
      p_key:       `validate_token:${token}`,
      p_max_count: 20,
    });

    const rl = rlData as RateResult;
    if (!rl?.ok) {
      console.warn(`[demo-magic-link] Rate limit validate token: ${token.slice(0, 8)}…`);
      return json({ ok: false, error: "rate_limit_exceeded", reset_at: rl?.reset_at }, 429);
    }

    // Valider le token en base
    const { data: validateData, error: validateErr } = await admin.rpc("demo_validate_magic_link", {
      p_token: token,
    });

    if (validateErr) {
      console.error("[demo-magic-link] demo_validate_magic_link error:", validateErr.message);
      return json({ ok: false, error: "validation_error" }, 500);
    }

    const result = validateData as ValidateResult;

    if (!result.ok) {
      console.warn(`[demo-magic-link] Validate failed: ${result.error} — token: ${token.slice(0, 8)}…`);
      return json({ ok: false, error: result.error }, 404);
    }

    // Générer un Supabase Auth magic link (OTP) pour le prospect
    const redirectTo = `${APP_URL}/demo/onboarding`;

    const { data: otpData, error: otpErr } = await admin.auth.admin.generateLink({
      type:       "magiclink",
      email:      result.email!,
      options: { redirectTo },
    });

    if (otpErr || !otpData?.properties?.action_link) {
      console.error("[demo-magic-link] generateLink error:", otpErr?.message);
      return json({ ok: false, error: "auth_link_failed" }, 500);
    }

    console.log(`[demo-magic-link] Validated for ${result.email} → onboarding`);
    return json({
      ok:         true,
      magic_link: otpData.properties.action_link,
      fleet_id:   result.fleet_id,
    });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});
