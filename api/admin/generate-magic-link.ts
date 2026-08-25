/**
 * Vercel BFF: /api/admin/generate-magic-link
 *
 * Generates a new magic link for an existing demo account. ADMIN_SECRET stays
 * server-side.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyCors,
  handlePreflight,
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

  const body = req.body as {
    user_id?: string;
    fleet_id?: string;
    email?: string;
    label?: string;
  };

  if (!body?.user_id || !body?.email) {
    res.status(400).json({ ok: false, error: "missing_fields: user_id, email requis" });
    return;
  }

  if (!auth.env.adminSecret || !auth.env.url) {
    res.status(500).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  try {
    const upstream = await fetch(`${auth.env.url}/functions/v1/demo-magic-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.env.adminSecret}`,
      },
      body: JSON.stringify({
        action: "create",
        user_id: body.user_id,
        fleet_id: body.fleet_id ?? null,
        email: body.email,
        label: body.label,
      }),
    });

    const data = (await upstream.json()) as Record<string, unknown>;

    if (upstream.status === 429) {
      res.status(429).json(data);
      return;
    }

    if (!upstream.ok) {
      res.status(upstream.status).json(data);
      return;
    }

    console.log(`[bff/generate-magic-link] Success - admin: ${auth.user.id}`);
    res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
}
