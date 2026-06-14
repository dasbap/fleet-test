/**
 * Sonde liveness Vercel — /api/health
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  res.status(200).json({
    status: "ok",
    ts: new Date().toISOString(),
  });
}
