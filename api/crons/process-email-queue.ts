import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function secureEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const authorization = req.headers.authorization ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (!CRON_SECRET || !secureEqual(token, CRON_SECRET)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    res.status(503).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  try {
    const upstream = await fetch(`${SUPABASE_URL}/functions/v1/process-notification-queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: "{}",
    });

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
