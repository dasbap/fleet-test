import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getAppUrl } from "../../src/server/env.js";
import {
  applyCors,
  extractBearerToken,
  fetchWithTimeout,
  getSupabaseEnv,
  handlePreflight,
  isFetchTimeout,
} from "../_lib/vercel-api.js";

const UPSTREAM_TIMEOUT_MS = 3_500;

const bodySchema = z.object({
  user_id: z.string().uuid(),
  fleet_id: z.string().uuid().nullable().optional(),
  email: z.string().email(),
  label: z.string().trim().min(1).optional(),
});

function normalizeBody(body: unknown): unknown {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString("utf8"));
    } catch {
      return null;
    }
  }

  return body;
}

function requestOrigin(req: VercelRequest): string {
  const raw = req.headers.origin;
  return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
}

function isAllowedOrigin(req: VercelRequest): boolean {
  const origin = requestOrigin(req).trim().replace(/\/$/, "");
  if (!origin) return true;

  const allowed = new Set([
    getAppUrl(),
    "https://www.e-samba.com",
    "https://app.e-samba.com",
    "https://fleet-test-gamma.vercel.app",
  ]);

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) allowed.add(`https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}`);

  return allowed.has(origin);
}

async function fetchJson(
  url: string,
  init: RequestInit,
): Promise<{ response: Response; body: unknown }> {
  const response = await fetchWithTimeout(url, init, UPSTREAM_TIMEOUT_MS);
  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { response, body };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  applyCors(req, res);
  if (handlePreflight(req, res)) return;

  console.info("[magic-link] request:start");

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  if (!isAllowedOrigin(req)) {
    res.status(403).json({ ok: false, error: "origin_not_allowed" });
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ ok: false, error: "missing_auth_token" });
    return;
  }

  const parsed = bodySchema.safeParse(normalizeBody(req.body));
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: "invalid_payload",
      details: parsed.error.flatten(),
    });
    return;
  }

  console.info("[magic-link] payload:valid");

  const env = getSupabaseEnv();
  if (!env.url || !env.anonKey || !env.serviceRoleKey) {
    res.status(503).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  try {
    console.info("[magic-link] auth:start");
    const auth = await fetchJson(`${env.url}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: env.anonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!auth.response.ok || !auth.body || typeof auth.body !== "object") {
      res.status(401).json({ ok: false, error: "invalid_token" });
      return;
    }

    const userId =
      "id" in auth.body && typeof auth.body.id === "string" ? auth.body.id : "";
    if (!userId) {
      res.status(401).json({ ok: false, error: "invalid_token" });
      return;
    }

    console.info("[magic-link] auth:done");
    console.info("[magic-link] admin-check:start");

    const adminCheck = await fetchJson(
      `${env.url}/rest/v1/rpc/is_platform_admin`,
      {
        method: "POST",
        headers: {
          apikey: env.anonKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      },
    );

    if (!adminCheck.response.ok || adminCheck.body !== true) {
      res.status(403).json({ ok: false, error: "forbidden_not_platform_admin" });
      return;
    }

    console.info("[magic-link] admin-check:done");
    console.info("[magic-link] rpc:start");

    const rpc = await fetchJson(
      `${env.url}/rest/v1/rpc/demo_create_magic_link`,
      {
        method: "POST",
        headers: {
          apikey: env.serviceRoleKey,
          Authorization: `Bearer ${env.serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_user_id: parsed.data.user_id,
          p_fleet_id: parsed.data.fleet_id ?? null,
          p_email: parsed.data.email,
          p_label: parsed.data.label ?? null,
          p_expires_at: null,
          p_created_by: userId,
        }),
      },
    );

    console.info("[magic-link] rpc:done");

    const result =
      rpc.body && typeof rpc.body === "object"
        ? (rpc.body as { ok?: boolean; token?: string })
        : null;

    if (!rpc.response.ok || result?.ok !== true || !result.token) {
      res.status(500).json({ ok: false, error: "create_failed" });
      return;
    }

    const magicUrl = `${getAppUrl()}/demo/access?token=${result.token}`;
    console.info("[magic-link] response:done");
    res.status(200).json({ ok: true, magic_url: magicUrl });
  } catch (error) {
    if (isFetchTimeout(error)) {
      console.error("[magic-link] upstream:timeout");
      res.status(504).json({ ok: false, error: "upstream_timeout" });
      return;
    }

    console.error("[magic-link] internal:error", error);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
}
