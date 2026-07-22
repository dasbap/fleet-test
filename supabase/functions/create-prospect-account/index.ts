/**
 * Edge Function : create-prospect-account
 *
 * Crée un compte prospect temporaire (essai 7 jours) E-Samba.
 *
 * Flow :
 *   1. Valider ADMIN_SECRET (seule l'équipe commerciale peut créer des prospects)
 *   2. Créer le compte Supabase Auth (mot de passe auto-généré)
 *   3. Appeler prospect_create_account() SQL → demo_profiles + flotte_adhesions + prospect_registrations
 *   4. Retourner les credentials temporaires + lien de connexion
 *
 * Contraintes prospect :
 *   - Rôle driver uniquement (le plus restreint)
 *   - Flotte démo dédiée (is_demo = true)
 *   - Pas d'accès admin, pas multi-flotte, pas export massif, pas finance
 *   - Expiration automatique à J+7
 *
 * Variables ENV :
 *   - ADMIN_SECRET              : jeton interne équipe commerciale
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - APP_URL                   : URL du SaaS (pour le lien de connexion)
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_SECRET     = Deno.env.get("ADMIN_SECRET") ?? "";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL          = Deno.env.get("APP_URL") ?? "https://app.e-samba.com";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateProspectBody {
  email:        string;
  company_name?: string;
  account_type?: "prospect" | "investor" | "internal" | "dev";
  invited_by?:  string; // UUID de l'utilisateur interne qui invite
  fleet_id?:    string; // UUID flotte démo cible (optionnel — auto-sélection)
  trial_days?:  number; // Défaut : 7
  send_email?:  boolean;
  permanent_access?: boolean;
}

interface ProspectResult {
  ok:           boolean;
  user_id?:     string;
  email?:       string;
  fleet_id?:    string;
  trial_end?:   string;
  login_url?:   string;
  temp_password?: string; // Uniquement si send_email = false
  permanent_access?: boolean;
  error?:       string;
}

// ─── Génération mot de passe temporaire ───────────────────────────────────────

function generateTempPassword(): string {
  // Format mémorisable : Mot-4Chiffres-Symbole
  const words  = ["Samba", "Route", "Flotte", "Camion", "Cargo", "Africa"];
  const random = new Uint32Array(2);
  crypto.getRandomValues(random);
  const word   = words[random[0] % words.length];
  const digits = 1000 + (random[1] % 9000);
  const syms   = ["!", "@", "#", "$"];
  const sym    = syms[random[1] % syms.length];
  return `${word}${digits}${sym}`;
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://www.e-samba.com",
  "https://app.e-samba.com",
  "capacitor://localhost",
  "http://localhost:5173",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin":  allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // ── Auth interne ──────────────────────────────────────────────────────────
  let body: CreateProspectBody;
  try {
    body = await req.json() as CreateProspectBody;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!ADMIN_SECRET || token !== ADMIN_SECRET) {
    console.warn("[create-prospect-account] Unauthorized attempt");
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // ── Rate-limit : 10 créations/heure par token admin ──────────────────────
  const adminEarly = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const tokenHash = token.slice(0, 8);
  const { data: rlData } = await adminEarly.rpc("demo_check_rate_limit", {
    p_key:       `create_prospect:${tokenHash}`,
    p_max_count: 10,
  });
  const rl = rlData as { ok: boolean; error?: string; reset_at?: string } | null;
  if (!rl?.ok) {
    console.warn(`[create-prospect-account] Rate limit exceeded`);
    return Response.json(
      { ok: false, error: "rate_limit_exceeded", reset_at: rl?.reset_at },
      { status: 429 },
    );
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const {
    email,
    company_name,
    account_type = "prospect",
    invited_by,
    trial_days = 7,
    send_email = false,
    permanent_access = false,
  } = body;

  if (!email || !email.includes("@")) {
    return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  if (!["prospect", "investor", "internal", "dev"].includes(account_type)) {
    return Response.json({ ok: false, error: "invalid_account_type" }, { status: 400 });
  }

  if (trial_days < 1 || trial_days > 90) {
    return Response.json({ ok: false, error: "trial_days_must_be_1_to_90" }, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  if (permanent_access && !invited_by) {
    return Response.json({ ok: false, error: "forbidden_super_admin_required" }, { status: 403 });
  }

  if (permanent_access && invited_by) {
    const { data: superAdminProfile, error: superAdminErr } = await admin
      .from("admin_profiles")
      .select("user_id")
      .eq("user_id", invited_by)
      .eq("internal_role", "super_admin")
      .eq("is_active", true)
      .maybeSingle();

    if (superAdminErr || !superAdminProfile) {
      return Response.json({ ok: false, error: "forbidden_super_admin_required" }, { status: 403 });
    }
  }

  const runId = crypto.randomUUID();
  console.log(`[create-prospect-account] Run ${runId} — email: ${email}`);

  try {
    // ── 1. Vérifier si l'email existe déjà ────────────────────────────────
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const alreadyExists = existingUsers?.users?.some((u) => u.email === email);

    if (alreadyExists) {
      return Response.json(
        { ok: false, error: "email_already_registered" },
        { status: 409 },
      );
    }

    // ── 2. Créer le compte Supabase Auth ──────────────────────────────────
    const tempPassword = generateTempPassword();

    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password:      tempPassword,
      email_confirm: true, // Confirmer directement (pas de validation email nécessaire pour prospect)
      user_metadata: {
        account_type,
        company_name:  company_name ?? null,
        trial_days,
        permanent_access,
        created_by_demo: true,
      },
    });

    if (authErr || !authData?.user) {
      console.error("[create-prospect-account] createUser error:", authErr?.message);
      return Response.json(
        { ok: false, error: authErr?.message ?? "auth_create_failed" },
        { status: 500 },
      );
    }

    const userId = authData.user.id;

    // ── 3. Enregistrer le prospect en base ────────────────────────────────
    const { data: regData, error: regErr } = await admin.rpc("prospect_create_account", {
      p_user_id:      userId,
      p_email:        email,
      p_company_name: company_name ?? null,
      p_invited_by:   invited_by  ?? null,
      p_fleet_id:     null,
      p_trial_days:   trial_days,
      p_account_type: account_type,
      p_permanent_access: permanent_access,
    });

    if (regErr) {
      console.error("[create-prospect-account] prospect_create_account RPC error:", regErr.message);
      // Nettoyage : supprimer le compte auth si la DB a échoué
      await admin.auth.admin.deleteUser(userId);
      return Response.json(
        { ok: false, error: regErr.message },
        { status: 500 },
      );
    }

    const result = regData as {
      ok: boolean;
      fleet_id?: string;
      trial_end?: string;
      error?: string;
    };

    if (!result.ok) {
      await admin.auth.admin.deleteUser(userId);
      return Response.json(
        { ok: false, error: result.error ?? "registration_failed" },
        { status: 500 },
      );
    }

    // ── 4. Envoyer email de bienvenue (optionnel via notification_queue) ──
    if (send_email) {
      await admin.from("notification_queue").insert({
        to_email:    email,
        template_id: "prospect_welcome",
        metadata: {
          company_name:  company_name ?? email,
          trial_days,
          trial_end:     result.trial_end,
          permanent_access,
          login_url:     APP_URL,
          temp_password: tempPassword,
        },
        status:     "pending",
        created_at: new Date().toISOString(),
      });
    }

    const loginUrl = `${APP_URL}/auth?email=${encodeURIComponent(email)}&prospect=1`;

    const response: ProspectResult = {
      ok:           true,
      user_id:      userId,
      email,
      fleet_id:     result.fleet_id,
      trial_end:    result.trial_end,
      login_url:    loginUrl,
      permanent_access,
      // Retourner le mot de passe uniquement si pas d'email envoyé
      ...(send_email ? {} : { temp_password: tempPassword }),
    };

    console.log(`[create-prospect-account] Success — user: ${userId}, fleet: ${result.fleet_id}`);
    return Response.json(response, { status: 201 });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[create-prospect-account] FATAL:", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
});
