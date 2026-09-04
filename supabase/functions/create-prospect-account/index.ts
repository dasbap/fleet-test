import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.e-samba.com";
const FUNCTION_VERSION = "complete-client-profile-v8";
const CENTRAL_AFRICA_COUNTRY_CODES = new Set(["CM", "CF", "TD", "CG", "GA", "GQ"]);

interface CreateProspectBody {
  email: string;
  full_name: string;
  company_name: string;
  phone: string;
  company_identifier: string;
  country_code: string;
  account_type?: "prospect" | "investor" | "internal" | "dev";
  invited_by?: string;
  fleet_id?: string;
  trial_days?: number;
  send_email?: boolean;
  permanent_access?: boolean;
}

interface ProspectResult {
  ok: boolean;
  user_id?: string;
  email?: string;
  fleet_id?: string;
  trial_end?: string;
  login_url?: string;
  permanent_access?: boolean;
  must_set_password?: boolean;
  password_delivery?: "reset_email";
  function_version?: string;
  error?: string;
}

interface RegistrationResult {
  ok: boolean;
  fleet_id?: string;
  trial_end?: string;
  error?: string;
}

const ALLOWED_ORIGINS = [
  "https://www.e-samba.com",
  "https://app.e-samba.com",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:8080",
];

function generateTempPassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const encoded = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `Aa1!${encoded}`;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function jsonResponse(req: Request, body: ProspectResult | Record<string, unknown>, status: number): Response {
  return Response.json(body, { status, headers: corsHeaders(req) });
}

function requiredString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i]! ^ bb[i]!;
  return diff === 0;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { ok: false, error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return jsonResponse(req, { ok: false, error: "missing_server_configuration" }, 500);

  let body: CreateProspectBody;
  try {
    body = (await req.json()) as CreateProspectBody;
  } catch {
    return jsonResponse(req, { ok: false, error: "invalid_json" }, 400);
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const authorized =
    (ADMIN_SECRET && timingSafeEqual(token, ADMIN_SECRET)) ||
    timingSafeEqual(token, SERVICE_ROLE_KEY);
  if (!authorized) return jsonResponse(req, { ok: false, error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  const tokenHash = Array.from(new Uint8Array(digest).slice(0, 8)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const { data: rateLimitData, error: rateLimitError } = await admin.rpc("demo_check_rate_limit", { p_key: `create_prospect:${tokenHash}`, p_max_count: 10 });
  if (rateLimitError) return jsonResponse(req, { ok: false, error: "rate_limit_check_failed" }, 500);
  const rateLimit = rateLimitData as { ok: boolean; reset_at?: string } | null;
  if (!rateLimit?.ok) return jsonResponse(req, { ok: false, error: "rate_limit_exceeded", reset_at: rateLimit?.reset_at }, 429);

  const email = requiredString(body.email, 320).toLowerCase();
  const fullName = requiredString(body.full_name, 200);
  const companyName = requiredString(body.company_name, 200);
  const phone = requiredString(body.phone, 50);
  const companyIdentifier = requiredString(body.company_identifier, 200);
  const countryCode = requiredString(body.country_code, 2).toUpperCase();
  const accountType = body.account_type ?? "prospect";
  const invitedBy = body.invited_by ?? null;
  const fleetId = body.fleet_id ?? null;
  const trialDays = Number(body.trial_days ?? 31);
  const permanentAccess = body.permanent_access === true;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return jsonResponse(req, { ok: false, error: "invalid_email" }, 400);
  if (!fullName || !companyName || !phone || !companyIdentifier || !CENTRAL_AFRICA_COUNTRY_CODES.has(countryCode)) {
    return jsonResponse(req, { ok: false, error: "incomplete_client_profile" }, 400);
  }
  if (!["prospect", "investor", "internal", "dev"].includes(accountType)) return jsonResponse(req, { ok: false, error: "invalid_account_type" }, 400);
  if (!Number.isInteger(trialDays) || trialDays < 1 || trialDays > 90) return jsonResponse(req, { ok: false, error: "trial_days_must_be_1_to_90" }, 400);

  if (permanentAccess) {
    if (!invitedBy) return jsonResponse(req, { ok: false, error: "forbidden_super_admin_required" }, 403);
    const { data: superAdminProfile, error: superAdminError } = await admin.from("admin_profiles").select("user_id").eq("user_id", invitedBy).eq("internal_role", "super_admin").eq("is_active", true).maybeSingle();
    if (superAdminError || !superAdminProfile) return jsonResponse(req, { ok: false, error: "forbidden_super_admin_required" }, 403);
  }

  const { data: existingUsers, error: listUsersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listUsersError) return jsonResponse(req, { ok: false, error: "list_users_failed" }, 500);
  if (existingUsers.users.some((existingUser: { email?: string }) => existingUser.email?.trim().toLowerCase() === email)) {
    return jsonResponse(req, { ok: false, error: "email_already_registered" }, 409);
  }

  let createdUserId: string | null = null;
  try {
    const temporaryPasswordIssuedAt = new Date().toISOString();
    const clientProfile = { full_name: fullName, company_name: companyName, phone, company_identifier: companyIdentifier, country_code: countryCode };
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: generateTempPassword(),
      email_confirm: true,
      app_metadata: { must_set_password: true, temporary_password_active: true, temporary_password_issued_at: temporaryPasswordIssuedAt },
      user_metadata: {
        ...clientProfile,
        account_type: accountType,
        trial_days: trialDays,
        permanent_access: permanentAccess,
        created_by_demo: true,
      },
    });
    if (authError || !authData.user) return jsonResponse(req, { ok: false, error: "auth_create_failed" }, 500);
    createdUserId = authData.user.id;

    const { data: registrationData, error: registrationError } = await admin.rpc("prospect_create_account", {
      p_user_id: createdUserId,
      p_email: email,
      p_company_name: companyName,
      p_invited_by: invitedBy,
      p_fleet_id: fleetId,
      p_trial_days: trialDays,
      p_account_type: accountType,
      p_permanent_access: permanentAccess,
    });
    const registration = registrationData as RegistrationResult | null;
    if (registrationError || !registration?.ok) throw new Error("prospect_registration_failed");

    const { error: resetError } = await admin.auth.resetPasswordForEmail(email, { redirectTo: `${APP_URL.replace(/\/$/, "")}/auth/update-password` });
    if (resetError) throw new Error("password_setup_email_failed");

    if (body.send_email) {
      await admin.from("notification_queue").insert({
        to_email: email,
        template_id: "prospect_welcome",
        metadata: { ...clientProfile, trial_days: trialDays, trial_end: registration.trial_end, permanent_access: permanentAccess, login_url: APP_URL },
        status: "pending",
        created_at: new Date().toISOString(),
      });
    }

    return jsonResponse(req, {
      ok: true,
      user_id: createdUserId,
      email,
      fleet_id: registration.fleet_id,
      trial_end: registration.trial_end,
      login_url: `${APP_URL}/auth?email=${encodeURIComponent(email)}&prospect=1`,
      permanent_access: permanentAccess,
      must_set_password: true,
      password_delivery: "reset_email",
      function_version: FUNCTION_VERSION,
    }, 201);
  } catch {
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
    return jsonResponse(req, { ok: false, error: "account_creation_failed", function_version: FUNCTION_VERSION }, 500);
  }
});
