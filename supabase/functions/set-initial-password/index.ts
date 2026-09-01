import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 256;

const ALLOWED_ORIGINS = new Set([
  "https://e-samba.com",
  "https://www.e-samba.com",
  "https://app.e-samba.com",
  "https://fleet-test-gamma.vercel.app",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://www.e-samba.com";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(req) });
}

function readPassword(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const password = (body as Record<string, unknown>).password;
  return typeof password === "string" ? password : "";
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(req, { ok: false, error: "method_not_allowed" }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(req, { ok: false, error: "server_not_configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    return json(req, { ok: false, error: "missing_authorization" }, 401);
  }

  let password = "";
  try {
    password = readPassword(await req.json());
  } catch {
    return json(req, { ok: false, error: "invalid_json" }, 400);
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return json(req, { ok: false, error: "invalid_password_length" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const user = authData.user;

  if (authError || !user) {
    return json(req, { ok: false, error: "invalid_token" }, 401);
  }

  const { data: currentUserData, error: currentUserError } =
    await admin.auth.admin.getUserById(user.id);

  if (currentUserError || !currentUserData.user) {
    return json(req, { ok: false, error: "user_not_found" }, 404);
  }

  const currentUser = currentUserData.user;
  const appMetadata = currentUser.app_metadata ?? {};
  const userMetadata = currentUser.user_metadata ?? {};
  const mustSetPassword =
    appMetadata.must_set_password === true ||
    userMetadata.must_set_password === true;
  const temporaryPasswordActive =
    appMetadata.temporary_password_active === true ||
    userMetadata.temporary_password_active === true;

  if (!mustSetPassword && !temporaryPasswordActive) {
    return json(req, { ok: true, must_set_password: false });
  }

  const passwordSetAt = new Date().toISOString();
  const { data: updatedUserData, error: updateError } =
    await admin.auth.admin.updateUserById(user.id, {
      password,
      app_metadata: {
        ...appMetadata,
        must_set_password: false,
        temporary_password_active: false,
        password_set_at: passwordSetAt,
      },
      user_metadata: {
        ...userMetadata,
        must_set_password: false,
        temporary_password_active: false,
      },
    });

  if (updateError || !updatedUserData.user) {
    const code = updateError?.code ?? "password_update_failed";
    const status = code === "same_password" || code === "weak_password" ? 400 : 409;
    return json(
      req,
      {
        ok: false,
        error: code,
        details: updateError?.message ?? "Impossible de modifier le mot de passe.",
      },
      status
    );
  }

  return json(req, {
    ok: true,
    must_set_password: false,
    password_set_at: passwordSetAt,
  });
});
