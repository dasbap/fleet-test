import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.e-samba.com";
const UPSTREAM_TIMEOUT_MS = 3_000;

interface CreateBody {
  action: "create";
  user_id: string;
  fleet_id?: string | null;
  email: string;
  label?: string;
}

interface ValidateBody {
  action: "validate";
  token: string;
  app_origin?: string;
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

const ALLOWED_ORIGINS = [
  "https://www.e-samba.com",
  "https://app.e-samba.com",
  "https://fleet-test-gamma.vercel.app",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    Vary: "Origin",
  };
}

function json(data: unknown, status = 200, req?: Request): Response {
  const headers = req ? corsHeaders(req) : { "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0] };
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

async function hashSensitiveValue(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

function resolveAppOrigin(value: unknown): string {
  const candidate = typeof value === "string" ? value.trim().replace(/\/$/, "") : "";
  if (ALLOWED_ORIGINS.includes(candidate)) return candidate;
  const configured = APP_URL.trim().replace(/\/$/, "");
  if (ALLOWED_ORIGINS.includes(configured)) return configured;
  return "https://www.e-samba.com";
}

async function boundedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, req);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ ok: false, error: "server_configuration_error" }, 503, req);

  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400, req);
  }

  if (!body.action || !["create", "validate"].includes(body.action)) {
    return json({ ok: false, error: "invalid_action" }, 400, req);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { retry: false },
    global: { fetch: boundedFetch },
  });

  if (body.action === "create") {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!ADMIN_SECRET || !timingSafeEqual(token, ADMIN_SECRET)) {
      return json({ ok: false, error: "unauthorized" }, 401, req);
    }

    const { user_id, fleet_id, email, label } = body as CreateBody;
    if (!user_id || !email) return json({ ok: false, error: "missing_fields" }, 400, req);

    const tokenHash = await hashSensitiveValue(token);
    const { data: rlData, error: rlError } = await admin.rpc("demo_check_rate_limit", {
      p_key: `create_magic_link:${tokenHash}`,
      p_max_count: 10,
    });
    if (rlError) return json({ ok: false, error: "rate_limit_check_failed" }, 503, req);

    const rl = rlData as RateResult;
    if (!rl?.ok) return json({ ok: false, error: "rate_limit_exceeded", reset_at: rl?.reset_at }, 429, req);

    const { data: linkData, error: linkErr } = await admin.rpc("demo_create_magic_link", {
      p_user_id: user_id,
      p_fleet_id: fleet_id ?? null,
      p_email: email,
      p_label: label ?? null,
    });

    if (linkErr || !(linkData as { ok?: boolean })?.ok) {
      console.error("[demo-magic-link] demo_create_magic_link error", linkErr?.message);
      return json({ ok: false, error: "create_failed" }, 500, req);
    }

    const link = linkData as { ok: boolean; token: string };
    return json({ ok: true, magic_url: `${resolveAppOrigin(APP_URL)}/demo/access?token=${link.token}` }, 200, req);
  }

  const { token, app_origin } = body as ValidateBody;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!token || !UUID_RE.test(token)) return json({ ok: false, error: "token_not_found" }, 404, req);

  const { data: rlData, error: rlError } = await admin.rpc("demo_check_rate_limit", {
    p_key: `validate_token:${await hashSensitiveValue(token)}`,
    p_max_count: 20,
  });
  if (rlError) return json({ ok: false, error: "rate_limit_check_failed" }, 503, req);

  const rl = rlData as RateResult;
  if (!rl?.ok) return json({ ok: false, error: "rate_limit_exceeded", reset_at: rl?.reset_at }, 429, req);

  const { data: validateData, error: validateErr } = await admin.rpc("demo_validate_magic_link", {
    p_token: token,
  });
  if (validateErr) {
    console.error("[demo-magic-link] demo_validate_magic_link error", validateErr.message);
    return json({ ok: false, error: "validation_error" }, 500, req);
  }

  const result = validateData as ValidateResult;
  if (!result.ok || !result.email) return json({ ok: false, error: result.error ?? "token_not_found" }, 404, req);

  const redirectTo = `${resolveAppOrigin(app_origin)}/demo/onboarding`;
  const { data: otpData, error: otpErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: result.email,
    options: { redirectTo },
  });

  if (otpErr || !otpData?.properties?.action_link) {
    console.error("[demo-magic-link] generateLink error", otpErr?.message);
    return json({ ok: false, error: "auth_link_failed" }, 500, req);
  }

  return json({
    ok: true,
    magic_link: otpData.properties.action_link,
    fleet_id: result.fleet_id,
  }, 200, req);
});
