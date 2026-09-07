import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function timingSafeEqualStrings(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!CRON_SECRET || !timingSafeEqualStrings(token, CRON_SECRET)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    res.status(500).json({ ok: false, error: "configuration_error" });
    return;
  }

  try {
    const upstream = await fetch(`${SUPABASE_URL}/functions/v1/process-demo-verification-queue`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "x-cron-secret": CRON_SECRET,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    const body = await upstream.json().catch(() => ({})) as Record<string, unknown>;
    if (!upstream.ok) {
      res.status(upstream.status).json({ ok: false, upstream: body });
      return;
    }

    res.status(200).json({ ok: true, upstream: body });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
}
