import type { Context, Hono } from "hono";
import { createSupabaseServiceClient } from "../../infra/supabaseServiceClient.js";
import { createSupabaseUserClient } from "../../infra/supabaseUserClient.js";
import { getBearerToken } from "../auth.js";

async function requireSuperAdmin(c: Context) {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) return { response: c.json({ ok: false, error: "missing_auth_token" }, 401) };

  let client;
  try {
    client = createSupabaseUserClient(token);
  } catch {
    return { response: c.json({ ok: false, error: "server_configuration_error" }, 503) };
  }

  const { data: { user }, error: authError } = await client.auth.getUser(token);
  if (authError || !user) return { response: c.json({ ok: false, error: "invalid_token" }, 401) };

  const [{ data: isAdmin, error: adminError }, { data: isSuperAdmin, error: superAdminError }] = await Promise.all([
    client.rpc("is_platform_admin"),
    client.rpc("is_platform_super_admin"),
  ]);

  if (adminError || isAdmin !== true) {
    return { response: c.json({ ok: false, error: "forbidden_not_platform_admin" }, 403) };
  }
  if (superAdminError || isSuperAdmin !== true) {
    return { response: c.json({ ok: false, error: "forbidden_super_admin_required" }, 403) };
  }

  return { user };
}

async function readBody(c: Context): Promise<Record<string, unknown> | null> {
  try {
    const value = await c.req.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

async function deleteFleet(c: Context) {
  const auth = await requireSuperAdmin(c);
  if ("response" in auth) return auth.response;

  const body = await readBody(c);
  const fleetId = readString(body?.fleet_id);
  if (!fleetId) return c.json({ ok: false, error: "fleet_id_required" }, 400);

  const admin = createSupabaseServiceClient();
  if (!admin) return c.json({ ok: false, error: "server_configuration_error" }, 503);

  const { data: fleet, error: fleetError } = await admin
    .from("flottes")
    .select("id,nom")
    .eq("id", fleetId)
    .maybeSingle();

  if (fleetError) return c.json({ ok: false, error: "fleet_lookup_failed" }, 502);
  if (!fleet) return c.json({ ok: false, error: "fleet_not_found" }, 404);

  const { error: deleteError } = await admin.from("flottes").delete().eq("id", fleetId);
  if (deleteError) return c.json({ ok: false, error: "delete_fleet_failed" }, 502);

  return c.json({ ok: true, fleet_id: fleetId, fleet_name: fleet.nom ?? null }, 200);
}

async function deleteUser(c: Context) {
  const auth = await requireSuperAdmin(c);
  if ("response" in auth) return auth.response;

  const body = await readBody(c);
  const userId = readString(body?.user_id);
  const deleteOwnedDemoFleets = readBoolean(body?.delete_owned_demo_fleets);
  if (!userId) return c.json({ ok: false, error: "user_id_required" }, 400);
  if (userId === auth.user.id) {
    return c.json({ ok: false, error: "cannot_delete_current_super_admin" }, 409);
  }

  const admin = createSupabaseServiceClient();
  if (!admin) return c.json({ ok: false, error: "server_configuration_error" }, 503);

  const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId);
  if (targetError || !targetData.user) {
    return c.json({ ok: false, error: "user_not_found" }, 404);
  }

  const { data: targetAdminProfile, error: profileError } = await admin
    .from("admin_profiles")
    .select("internal_role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (profileError) return c.json({ ok: false, error: "admin_profile_lookup_failed" }, 502);
  if (targetAdminProfile?.internal_role === "super_admin") {
    return c.json({ ok: false, error: "cannot_delete_super_admin" }, 409);
  }

  const { data: organizerMemberships, error: organizerError } = await admin
    .from("flotte_adhesions")
    .select("id,fleet_id")
    .eq("user_id", userId)
    .eq("role", "organizer")
    .eq("is_active", true);

  if (organizerError) {
    return c.json({ ok: false, error: "organizer_membership_lookup_failed" }, 502);
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

    if (countError) return c.json({ ok: false, error: "organizer_count_failed" }, 502);
    if ((count ?? 0) === 0) lastOrganizerFleetIds.push(membership.fleet_id);
  }

  let canDeleteDemoFleets = false;
  if (lastOrganizerFleetIds.length > 0) {
    const { data: demoProfiles, error: demoProfileError } = await admin
      .from("demo_profiles")
      .select("fleet_id")
      .in("fleet_id", lastOrganizerFleetIds);

    if (demoProfileError) {
      return c.json({ ok: false, error: "demo_fleet_lookup_failed" }, 502);
    }

    const demoFleetIds = new Set(
      (demoProfiles ?? [])
        .map((profile) => profile.fleet_id)
        .filter((fleetId): fleetId is string => typeof fleetId === "string" && fleetId.length > 0),
    );
    canDeleteDemoFleets = lastOrganizerFleetIds.every((fleetId) => demoFleetIds.has(fleetId));

    if (!deleteOwnedDemoFleets || !canDeleteDemoFleets) {
      return c.json({
        ok: false,
        error: "last_active_organizer_required",
        fleet_ids: lastOrganizerFleetIds,
        can_delete_demo_fleets: canDeleteDemoFleets,
      }, 409);
    }

    const { error: deleteFleetsError } = await admin
      .from("flottes")
      .delete()
      .in("id", lastOrganizerFleetIds);
    if (deleteFleetsError) {
      return c.json({ ok: false, error: "delete_owned_demo_fleets_failed" }, 502);
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return c.json({
      ok: false,
      error: "delete_user_failed",
      detail: deleteError.message,
    }, 502);
  }

  return c.json({
    ok: true,
    user_id: userId,
    deleted_fleet_ids: lastOrganizerFleetIds,
  }, 200);
}

export function registerAdminDestructiveSecurityRoutes(app: Hono) {
  app.post("/api/admin/delete-user", deleteUser);
  app.post("/api/admin/delete-fleet", deleteFleet);
}
