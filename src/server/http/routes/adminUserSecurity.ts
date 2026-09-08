import type { Context, Hono } from "hono";
import { getAppUrl } from "../../env.js";
import { createSupabaseServiceClient } from "../../infra/supabaseServiceClient.js";
import { createSupabaseUserClient } from "../../infra/supabaseUserClient.js";
import { getBearerToken } from "../auth.js";

type AdminUserSummary = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  must_set_password: boolean;
  is_platform_admin: boolean;
};

async function requirePlatformAdmin(c: Context) {
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

  const [{ data: isAdmin }, { data: isSuperAdmin }] = await Promise.all([
    client.rpc("is_platform_admin"),
    client.rpc("is_platform_super_admin"),
  ]);

  if (isAdmin !== true) return { response: c.json({ ok: false, error: "forbidden_not_platform_admin" }, 403) };
  return { user, isSuperAdmin: isSuperAdmin === true };
}

async function handleGet(c: Context) {
  const auth = await requirePlatformAdmin(c);
  if ("response" in auth) return auth.response;

  const admin = createSupabaseServiceClient();
  if (!admin) return c.json({ ok: false, error: "server_configuration_error" }, 503);

  const allUsers = [];
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return c.json({ ok: false, error: "list_users_failed" }, 502);
    allUsers.push(...data.users);
    if (data.users.length < perPage) break;
    if (page >= 100) return c.json({ ok: false, error: "list_users_limit_exceeded" }, 502);
  }

  const userIds = allUsers.map((user) => user.id);
  const platformAdminIds = new Set<string>();

  for (let offset = 0; offset < userIds.length; offset += 500) {
    const chunk = userIds.slice(offset, offset + 500);
    if (chunk.length === 0) continue;

    const { data: adminProfiles, error: adminProfilesError } = await admin
      .from("admin_profiles")
      .select("user_id")
      .in("user_id", chunk)
      .eq("is_active", true);

    if (adminProfilesError) return c.json({ ok: false, error: "admin_profiles_lookup_failed" }, 502);
    for (const row of adminProfiles ?? []) platformAdminIds.add(String(row.user_id));
  }

  const users: AdminUserSummary[] = allUsers.map((user) => ({
    id: user.id,
    email: user.email ?? "",
    full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "",
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at ?? null,
    must_set_password: user.app_metadata?.must_set_password === true,
    is_platform_admin: platformAdminIds.has(user.id),
  }));

  return c.json({ ok: true, users }, 200);
}

async function handlePost(c: Context) {
  const auth = await requirePlatformAdmin(c);
  if ("response" in auth) return auth.response;

  const admin = createSupabaseServiceClient();
  if (!admin) return c.json({ ok: false, error: "server_configuration_error" }, 503);

  let body: Record<string, unknown>;
  try {
    const raw = await c.req.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return c.json({ ok: false, error: "invalid_body" }, 400);
    body = raw as Record<string, unknown>;
  } catch {
    return c.json({ ok: false, error: "invalid_body" }, 400);
  }

  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (!userId) return c.json({ ok: false, error: "user_id_required" }, 400);
  if (!["force_password_change", "send_password_reset", "create_recovery_link"].includes(action)) {
    return c.json({ ok: false, error: "invalid_action" }, 400);
  }
  if (action === "create_recovery_link" && !auth.isSuperAdmin) {
    return c.json({ ok: false, error: "forbidden_super_admin_required" }, 403);
  }

  const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(userId);
  const target = targetData.user;
  if (targetError || !target) return c.json({ ok: false, error: "user_not_found" }, 404);

  const { data: targetAdminProfile, error: targetAdminError } = await admin
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (targetAdminError) return c.json({ ok: false, error: "admin_profile_lookup_failed" }, 502);
  if (targetAdminProfile && !auth.isSuperAdmin) {
    return c.json({ ok: false, error: "forbidden_super_admin_required" }, 403);
  }

  if (action === "force_password_change") {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...(target.app_metadata ?? {}),
        must_set_password: true,
        temporary_password_active: false,
        password_change_required_at: new Date().toISOString(),
        password_change_required_by: auth.user.id,
      },
    });
    if (error) return c.json({ ok: false, error: "password_marker_update_failed" }, 502);
    return c.json({ ok: true, must_set_password: true }, 200);
  }

  const email = target.email?.trim().toLowerCase() ?? "";
  if (!email) return c.json({ ok: false, error: "user_email_missing" }, 400);

  const redirectTo = `${getAppUrl().replace(/\/$/, "")}/auth/update-password`;

  if (action === "send_password_reset") {
    const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return c.json({ ok: false, error: "password_reset_email_failed" }, 502);

    const { error: markerError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...(target.app_metadata ?? {}),
        must_set_password: true,
        temporary_password_active: false,
        password_change_required_at: new Date().toISOString(),
        password_change_required_by: auth.user.id,
      },
    });
    if (markerError) return c.json({ ok: false, error: "password_marker_update_failed" }, 502);
    return c.json({ ok: true, email, must_set_password: true }, 200);
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  const actionLink = data?.properties?.action_link;
  if (error || !actionLink) return c.json({ ok: false, error: "recovery_link_failed" }, 502);

  return c.json({ ok: true, recovery_link: actionLink, email }, 200);
}

export function registerAdminUserSecurityRoutes(app: Hono) {
  app.get("/api/admin/user-security", handleGet);
  app.post("/api/admin/user-security", handlePost);
}
