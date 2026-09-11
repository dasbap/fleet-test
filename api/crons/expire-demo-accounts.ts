import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function timingSafeEqualStrings(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return response.json().catch(() => ({ ok: false, error: "invalid_upstream_response" })) as Promise<Record<string, unknown>>;
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

  if (!SUPABASE_URL) {
    res.status(503).json({ ok: false, error: "configuration_error" });
    return;
  }

  const results: Record<string, unknown> = {};
  let failed = false;

  try {
    const expireResponse = await fetch(`${SUPABASE_URL}/functions/v1/expire-demo-accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: CRON_SECRET }),
    });
    results.expire_demo_accounts = await readJson(expireResponse);
    if (!expireResponse.ok) failed = true;
  } catch (error) {
    failed = true;
    results.expire_demo_accounts = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (SERVICE_ROLE_KEY) {
    try {
      const queueResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-notification-queue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: "{}",
      });
      results.email_queue = await readJson(queueResponse);
      if (!queueResponse.ok) failed = true;
    } catch (error) {
      failed = true;
      results.email_queue = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } else {
    failed = true;
    results.email_queue = { ok: false, error: "service_role_key_missing" };
  }

  res.status(failed ? 502 : 200).json({ ok: !failed, ...results });
}
