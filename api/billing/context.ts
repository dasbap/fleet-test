/**
 * BFF Vercel : /api/billing/context
 *
 * Expose le contexte facturation d'une flotte via RPC (JWT utilisateur, RLS).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyCors,
  handlePreflight,
  requireAuthenticatedUser,
} from "../_lib/vercel-api.js";

function resolveFleetId(req: VercelRequest): string | null {
  const queryId = typeof req.query.fleet_id === "string" ? req.query.fleet_id.trim() : "";
  if (queryId) return queryId;

  const body = req.body as { fleet_id?: string } | undefined;
  const bodyId = body?.fleet_id?.trim() ?? "";
  return bodyId || null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  applyCors(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const fleetId = resolveFleetId(req);
  if (!fleetId) {
    res.status(400).json({ ok: false, error: "missing_fleet_id" });
    return;
  }

  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return;

  const { data, error } = await auth.client.rpc("get_fleet_billing_context", {
    p_fleet_id: fleetId,
  });

  if (error) {
    console.error("[bff/billing/context] RPC error:", error.message);
    const status = error.code === "PGRST116" || error.message.includes("permission") ? 403 : 500;
    res.status(status).json({ ok: false, error: "billing_context_unavailable" });
    return;
  }

  res.status(200).json({
    ok: true,
    fleet_id: fleetId,
    context: data,
  });
}
