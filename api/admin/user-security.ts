import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import {
  applyCors,
  fetchWithTimeout,
  handlePreflight,
  requirePlatformAdmin,
} from "../_lib/vercel-api.js";

type AdminUserSummary = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  must_set_password: boolean;
  is_platform_admin: boolean;
};

function asBody(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  applyCors(req, res);
  if (handlePreflight(req, res)) return;

  const auth = await requirePlatformAdmin(req, res);
  if (!auth) return;
  if (!auth.env.serviceRoleKey) {
    res.status(503).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  const admin = createClient(auth.env.url, auth.env.serviceRoleKey, {
    global: { fetch: (input, init) => fetchWithTimeout(input, init, 5_000) },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerSuperAdminData } = await auth.client.rpc(
    "is_platform_super_admin",
  );
  const callerIsSuperAdmin = callerSuperAdminData === true;

  if (req.method === "GET") {
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) {
      res.status(502).json({ ok: false, error: "list_users_failed" });
      return;
    }

    const userIds = data.users.map((user) => user.id);
    const { data: adminProfiles, error: adminProfilesError } = userIds.length
      ? await admin
          .from("admin_profiles")
          .select("user_id")
          .in("user_id", userIds)
          .eq("is_active", true)
      : { data: [], error: null };

    if (adminProfilesError) {
      res.status(502).json({ ok: false, error: "admin_profiles_lookup_failed" });
      return;
    }

    const platformAdminIds = new Set(
      (adminProfiles ?? []).map((row) => String(row.user_id)),
    );

    const users: AdminUserSummary[] = data.users.map((user) => ({
      id: user.id,
      email: user.email ?? "",
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : "",
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
      must_set_password: user.app_metadata?.must_set_password === true,
      is_platform_admin: platformAdminIds.has(user.id),
    }));

    res.status(200).json({ ok: true, users });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const body = asBody(req.body);
  if (!body) {
    res.status(400).json({ ok: false, error: "invalid_body" });
    return;
  }

  const userId = asString(body.user_id);
  const action = asString(body.action);
  if (!userId) {
    res.status(400).json({ ok: false, error: "user_id_required" });
    return;
  }

  const { data: targetData, error: targetError } =
    await admin.auth.admin.getUserById(userId);
  const target = targetData.user;
  if (targetError || !target) {
    res.status(404).json({ ok: false, error: "user_not_found" });
    return;
  }

  const { data: targetAdminProfile, error: targetAdminError } = await admin
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (targetAdminError) {
    res.status(502).json({ ok: false, error: "admin_profile_lookup_failed" });
    return;
  }

  if (targetAdminProfile && !callerIsSuperAdmin) {
    res.status(403).json({ ok: false, error: "forbidden_super_admin_required" });
    return;
  }

  if (action === "force_password_change") {
    const appMetadata = target.app_metadata ?? {};
    const { error } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...appMetadata,
        must_set_password: true,
        temporary_password_active: false,
        password_change_required_at: new Date().toISOString(),
        password_change_required_by: auth.user.id,
      },
    });

    if (error) {
      res.status(502).json({ ok: false, error: "password_marker_update_failed" });
      return;
    }

    res.status(200).json({ ok: true, must_set_password: true });
    return;
  }

  if (action === "send_password_reset") {
    const email = target.email?.trim().toLowerCase() ?? "";
    if (!email) {
      res.status(400).json({ ok: false, error: "user_email_missing" });
      return;
    }

    const redirectTo = `${auth.env.appUrl.replace(/\/$/, "")}/auth/update-password`;
    const { error } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      res.status(502).json({ ok: false, error: "password_reset_email_failed" });
      return;
    }

    const appMetadata = target.app_metadata ?? {};
    const { error: markerError } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...appMetadata,
        must_set_password: true,
        temporary_password_active: false,
        password_change_required_at: new Date().toISOString(),
        password_change_required_by: auth.user.id,
      },
    });

    if (markerError) {
      res.status(502).json({ ok: false, error: "password_marker_update_failed" });
      return;
    }

    res.status(200).json({ ok: true, email, must_set_password: true });
    return;
  }

  if (action === "create_recovery_link") {
    const email = target.email?.trim().toLowerCase() ?? "";
    if (!email) {
      res.status(400).json({ ok: false, error: "user_email_missing" });
      return;
    }

    const redirectTo = `${auth.env.appUrl.replace(/\/$/, "")}/auth/update-password`;
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    const actionLink = data?.properties?.action_link;
    if (error || !actionLink) {
      res.status(502).json({ ok: false, error: "recovery_link_failed" });
      return;
    }

    res.status(200).json({
      ok: true,
      recovery_link: actionLink,
      email,
    });
    return;
  }

  res.status(400).json({ ok: false, error: "invalid_action" });
}
