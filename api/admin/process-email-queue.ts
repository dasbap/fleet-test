import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyCors,
  fetchWithTimeout,
  handlePreflight,
  requirePlatformAdmin,
} from "../_lib/vercel-api.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const auth = await requirePlatformAdmin(req, res);
  if (!auth) return;

  if (!auth.env.url || !auth.env.serviceRoleKey) {
    res.status(503).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  try {
    const upstream = await fetchWithTimeout(
      `${auth.env.url}/functions/v1/process-notification-queue`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: auth.env.serviceRoleKey,
          Authorization: `Bearer ${auth.env.serviceRoleKey}`,
        },
        body: "{}",
      },
      12_000,
    );

    const payload = await upstream.json().catch(() => ({ ok: false, error: "invalid_upstream_response" }));
    res.status(upstream.ok ? 200 : 502).json(payload);
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: "email_queue_processor_unreachable",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
