import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { applyCors, getSupabaseEnv, handlePreflight } from "../_lib/vercel-api.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolveAppUrl(req: VercelRequest, configuredAppUrl: string): string {
  const fallback = configuredAppUrl.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return fallback;

  const rawOrigin = Array.isArray(req.headers.origin)
    ? req.headers.origin[0]
    : req.headers.origin;
  const origin = typeof rawOrigin === "string" ? rawOrigin.trim().replace(/\/$/, "") : "";

  try {
    const url = new URL(origin);
    if (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.username === "" &&
      url.password === ""
    ) {
      return origin;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const env = getSupabaseEnv();
  if (!env.url || !env.serviceRoleKey) {
    res.status(503).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  const body = req.body as { action?: string; token?: string };
  if (body?.action !== "validate" || !body.token || !UUID_RE.test(body.token)) {
    res.status(404).json({ ok: false, error: "token_not_found" });
    return;
  }

  const admin = createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await admin.rpc("demo_validate_magic_link", {
    p_token: body.token,
  });

  if (error) {
    res.status(500).json({ ok: false, error: "validation_error" });
    return;
  }

  const result = data as {
    ok?: boolean;
    email?: string;
    fleet_id?: string;
    error?: string;
  } | null;

  if (!result?.ok || !result.email) {
    res.status(404).json({ ok: false, error: result?.error ?? "token_not_found" });
    return;
  }

  const appUrl = resolveAppUrl(req, env.appUrl);
  const { data: otpData, error: otpError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: result.email,
    options: { redirectTo: `${appUrl}/demo/onboarding` },
  });

  if (otpError || !otpData?.properties?.action_link) {
    res.status(500).json({ ok: false, error: "auth_link_failed" });
    return;
  }

  res.status(200).json({
    ok: true,
    magic_link: otpData.properties.action_link,
    fleet_id: result.fleet_id,
  });
}
