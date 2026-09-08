import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "billing@e-samba.com";
const DEFAULT_APP_URL = "https://www.e-samba.com";

const ALLOWED_ORIGINS = new Set([
  "https://e-samba.com",
  "https://www.e-samba.com",
  "https://app.e-samba.com",
  "https://fleet-test-gamma.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : DEFAULT_APP_URL;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(req) });
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function resolveRedirect(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (!ALLOWED_ORIGINS.has(url.origin)) return null;
    if (url.pathname !== "/auth/update-password") return null;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function hashValue(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 16))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { ok: false, error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    return json(req, { ok: false, error: "server_not_configured" }, 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return json(req, { ok: false, error: "invalid_json" }, 400);
  }

  const email = normalizeEmail(body.email);
  const redirectTo = resolveRedirect(body.redirectTo);
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !redirectTo) {
    return json(req, { ok: false, error: "invalid_request" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rateLimitData, error: rateLimitError } = await admin.rpc("demo_check_rate_limit", {
    p_key: `password_reset:${await hashValue(email)}`,
    p_max_count: 5,
  });
  if (rateLimitError) return json(req, { ok: false, error: "rate_limit_check_failed" }, 503);
  const rateLimit = rateLimitData as { ok?: boolean; reset_at?: string } | null;
  if (rateLimit?.ok !== true) {
    return json(req, { ok: false, error: "rate_limit_exceeded", reset_at: rateLimit?.reset_at }, 429);
  }

  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (linkError || !data?.properties?.action_link) {
    const message = linkError?.message?.toLowerCase() ?? "";
    if (message.includes("not found") || message.includes("does not exist")) {
      return json(req, { ok: true });
    }
    console.error("[request-password-reset] generateLink failed:", linkError?.message ?? "missing_action_link");
    return json(req, { ok: false, error: "recovery_link_generation_failed" }, 502);
  }

  const actionUrl = new URL(data.properties.action_link);
  const tokenHash = actionUrl.searchParams.get("token");
  if (!tokenHash) {
    console.error("[request-password-reset] recovery token missing from generated action link");
    return json(req, { ok: false, error: "recovery_token_missing" }, 502);
  }

  const recoveryUrl = new URL(redirectTo);
  recoveryUrl.searchParams.set("token_hash", tokenHash);
  recoveryUrl.searchParams.set("type", "recovery");
  const safeRecoveryUrl = escapeHtml(recoveryUrl.toString());

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `E-Samba <${FROM_EMAIL}>`,
      to: [email],
      subject: "Réinitialiser votre mot de passe E-Samba",
      html: `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;color:#111827"><div style="max-width:560px;margin:0 auto;padding:24px"><h1 style="font-size:22px">Réinitialisation du mot de passe</h1><p>Une demande de réinitialisation a été faite pour votre compte E-Samba.</p><p><a href="${safeRecoveryUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Choisir un nouveau mot de passe</a></p><p style="font-size:13px;color:#6b7280">Ce lien est à usage unique et expire automatiquement. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p></div></body></html>`,
    }),
  });

  if (!resendResponse.ok) {
    const detail = await resendResponse.text().catch(() => "");
    console.error("[request-password-reset] Resend failed:", resendResponse.status, detail.slice(0, 200));
    return json(req, { ok: false, error: "email_delivery_failed" }, 502);
  }

  return json(req, { ok: true });
});
