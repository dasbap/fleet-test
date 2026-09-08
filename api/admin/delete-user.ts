import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createAdminClient, applyCors, handlePreflight, requirePlatformAdmin } from "../_lib/vercel-api.js";

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
  const userId = asString(body?.user_id);
  const deleteOwnedDemoFleets = body?.delete_owned_demo_fleets === true;
  if (!userId) {
    res.status(400).json({ ok: false, error: "user_id_required" });
    return;
  }
  if (userId === auth.user.id) {
    res.status(409).json({ ok: false, error: "cannot_delete_current_super_admin" });
    return;
  }

  let admin;
  try {
    admin = createAdminClient(auth.env);
  } catch {
    res.status(503).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId);
  if (targetError || !targetData.user) {
    res.status(404).json({ ok: false, error: "user_not_found" });
    return;
  }

  const { data: targetAdminProfile, error: profileError } = await admin
    .from("admin_profiles")
    .select("internal_role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (profileError) {
    res.status(502).json({ ok: false, error: "admin_profile_lookup_failed" });
    return;
  }
  if (targetAdminProfile?.internal_role === "super_admin") {
    res.status(409).json({ ok: false, error: "cannot_delete_super_admin" });
    return;
  }

  const { data: organizerMemberships, error: organizerError } = await admin
    .from("flotte_adhesions")
    .select("id,fleet_id")
    .eq("user_id", userId)
    .eq("role", "organizer")
    .eq("is_active", true);

  if (organizerError) {
    res.status(502).json({ ok: false, error: "organizer_membership_lookup_failed" });
    return;
  }

  const lastOrganizerFleetIds: string[] = [];
  for (const membership of organizerMemberships ?? []) {
    const { count, error: countError } = await admin
      .from("flotte_adhesions")
      .select("id", { count: "exact", head: true })
      .eq("fleet_id", membership.fleet_id)
      .eq("role", "organizer")
      .eq("is_active", true)
      .neq("user_id", userId);
    if (countError) {
      res.status(502).json({ ok: false, error: "organizer_count_failed" });
      return;
    }
    if ((count ?? 0) === 0) lastOrganizerFleetIds.push(membership.fleet_id);
  }

  if (lastOrganizerFleetIds.length > 0) {
    const { data: fleets, error: fleetsError } = await admin
      .from("flottes")
      .select("id,is_demo")
      .in("id", lastOrganizerFleetIds);
    if (fleetsError) {
      res.status(502).json({ ok: false, error: "fleet_lookup_failed" });
      return;
    }

    const demoFleetIds = (fleets ?? []).filter((fleet) => fleet.is_demo === true).map((fleet) => fleet.id);
    const nonDemoFleetIds = (fleets ?? []).filter((fleet) => fleet.is_demo !== true).map((fleet) => fleet.id);

    if (nonDemoFleetIds.length > 0) {
      res.status(409).json({
        ok: false,
        error: "last_active_organizer_required",
        fleet_ids: nonDemoFleetIds,
        can_delete_demo_fleets: false,
      });
      return;
    }

    if (!deleteOwnedDemoFleets) {
      res.status(409).json({
        ok: false,
        error: "last_active_organizer_required",
        fleet_ids: demoFleetIds,
        can_delete_demo_fleets: true,
      });
      return;
    }

    if (demoFleetIds.length > 0) {
      const { error: deleteFleetsError } = await admin.from("flottes").delete().in("id", demoFleetIds);
      if (deleteFleetsError) {
        res.status(502).json({ ok: false, error: "delete_demo_fleets_failed" });
        return;
      }
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    res.status(502).json({ ok: false, error: "delete_user_failed" });
    return;
  }

  res.status(200).json({ ok: true, user_id: userId });
}
