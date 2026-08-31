/**
 * Vercel BFF: /api/admin/create-prospect
 *
 * Secure proxy between the admin frontend and the create-prospect-account Edge
 * Function. ADMIN_SECRET stays server-side.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyCors,
  fetchWithTimeout,
  handlePreflight,
  isFetchTimeout,
  requirePlatformAdmin,
} from "../_lib/vercel-api.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  applyCors(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const auth = await requirePlatformAdmin(req, res);
  if (!auth) return;

  const { data: isSuperAdminUser, error: superAdminErr } = await auth.client.rpc(
    "is_platform_super_admin",
  );

  const body = req.body as {
    email?: string;
    company_name?: string;
    account_type?: string;
    fleet_id?: string;
    trial_days?: number;
    send_email?: boolean;
    permanent_access?: boolean;
  };

  if (!body?.email || !body.email.includes("@")) {
    res.status(400).json({ ok: false, error: "invalid_email" });
    return;
  }

  if (body.permanent_access && (superAdminErr || isSuperAdminUser !== true)) {
    res.status(403).json({ ok: false, error: "forbidden_super_admin_required" });
    return;
  }

  if (!auth.env.adminSecret || !auth.env.url) {
    console.error("[bff/create-prospect] Missing server configuration");
    res.status(500).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  try {
    const upstream = await fetchWithTimeout(
      `${auth.env.url}/functions/v1/create-prospect-account`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.env.adminSecret}`,
        },
        body: JSON.stringify({
          email: body.email,
          company_name: body.company_name,
          account_type: body.account_type ?? "prospect",
          fleet_id: null,
          trial_days: body.trial_days ?? 31,
          send_email: body.send_email ?? false,
          permanent_access: body.permanent_access === true,
          invited_by: auth.user.id,
        }),
      },
    );

    const data = (await upstream.json()) as Record<string, unknown>;

    if (upstream.status === 429) {
      res.status(429).json(data);
      return;
    }

    if (!upstream.ok) {
      console.error("[bff/create-prospect] Edge Function error:", data);
      res.status(upstream.status).json(data);
      return;
    }

    console.log(
      `[bff/create-prospect] Success - admin: ${auth.user.id}, email: ${body.email}`,
    );
    res.status(201).json(data);
  } catch (err) {
    if (isFetchTimeout(err)) {
      res.status(504).json({ ok: false, error: "upstream_timeout" });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[bff/create-prospect] fetch error:", message);
    res.status(500).json({ ok: false, error: message });
  }
}