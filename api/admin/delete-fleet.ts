import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, createAdminClient, handlePreflight, requirePlatformAdmin } from "../_lib/vercel-api.js";

function asBody(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(req, res);
  res.setHeader("Cache-Control", "no-store");
  if (handlePreflight(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const auth = await requirePlatformAdmin(req, res);
  if (!auth) return;

  const { data: isSuperAdmin, error: superAdminError } = await auth.client.rpc("is_platform_super_admin");
  if (superAdminError || isSuperAdmin !== true) {
    res.status(403).json({ ok: false, error: "forbidden_super_admin_required" });
    return;
  }

  const body = asBody(req.body);
  const fleetId = asString(body?.fleet_id);
  if (!fleetId) {
    res.status(400).json({ ok: false, error: "fleet_id_required" });
    return;
  }

  let admin;
  try {
    admin = createAdminClient(auth.env);
  } catch {
    res.status(503).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  const { data: fleet, error: fleetError } = await admin
    .from("flottes")
    .select("id, nom, org_id")
    .eq("id", fleetId)
    .maybeSingle();

  if (fleetError) {
    res.status(502).json({ ok: false, error: "fleet_lookup_failed" });
    return;
  }
  if (!fleet) {
    res.status(404).json({ ok: false, error: "fleet_not_found" });
    return;
  }

  const { error: deleteError } = await admin.from("flottes").delete().eq("id", fleetId);
  if (deleteError) {
    res.status(502).json({ ok: false, error: "delete_fleet_failed" });
    return;
  }

  res.status(200).json({ ok: true, fleet_id: fleetId, fleet_name: fleet.nom ?? null });
}
