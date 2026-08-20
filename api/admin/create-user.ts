import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  applyCors,
  handlePreflight,
  requireAuthenticatedUser,
} from "../_lib/vercel-api.js";

const VALID_FLEET_ROLES = new Set(["organizer", "manager", "driver", "mechanic"]);
const MAX_NAME_LENGTH = 200;
const MAX_PHONE_LENGTH = 64;
const MAX_PROVISIONING_REQUESTS = 20;

function generateTempPassword(): string {
  return randomBytes(18).toString("base64url");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBody(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function requireAccountProvisioner(
  req: VercelRequest,
  res: VercelResponse,
) {
  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return null;

  const [{ data: isAdmin }, { data: isSuperAdmin }] = await Promise.all([
    auth.client.rpc("is_platform_admin"),
    auth.client.rpc("is_platform_super_admin"),
  ]);
  return { ...auth, isAdmin: isAdmin === true, isSuperAdmin: isSuperAdmin === true };
}

type AccountProvisioner = NonNullable<Awaited<ReturnType<typeof requireAccountProvisioner>>>;

async function assertCanProvisionFleetRole(
  auth: AccountProvisioner,
  fleetId: string,
  role: string,
): Promise<"allowed" | "forbidden_fleet_scope"> {
  if (auth.isAdmin) return "allowed";
  if (!fleetId || !VALID_FLEET_ROLES.has(role)) return "forbidden_fleet_scope";

  const { data, error } = await auth.client
    .from("flotte_adhesions")
    .select("role")
    .eq("fleet_id", fleetId)
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || data?.role !== "organizer") {
    return "forbidden_fleet_scope";
  }

  return "allowed";
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  applyCors(res, process.env.VITE_APP_URL ?? "*");
  if (handlePreflight(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const auth = await requireAccountProvisioner(req, res);
  if (!auth) return;

  if (!auth.env.serviceRoleKey) {
    res.status(500).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  const body = asBody(req.body);
  if (!body) {
    res.status(400).json({ ok: false, error: "invalid_body" });
    return;
  }

  const email = asString(body.email).toLowerCase();
  const fullName = asString(body.full_name);
  const phone = asString(body.phone);
  const fleetId = asString(body.fleet_id);
  const role = asString(body.role);
  const providedPassword = asString(body.password);
  const platformAdminRequested = body.platform_admin === true || role === "admin";

  if (providedPassword) {
    res.status(400).json({ ok: false, error: "password_must_not_be_provided" });
    return;
  }

  if (!email || !email.includes("@") || email.length > 320) {
    res.status(400).json({ ok: false, error: "invalid_email" });
    return;
  }

  if (fullName.length > MAX_NAME_LENGTH || phone.length > MAX_PHONE_LENGTH) {
    res.status(400).json({ ok: false, error: "invalid_profile_fields" });
    return;
  }

  if (platformAdminRequested && !auth.isSuperAdmin) {
    res.status(403).json({ ok: false, error: "forbidden_super_admin_required" });
    return;
  }

  if (!platformAdminRequested && !fleetId && role !== "organizer") {
    res.status(400).json({ ok: false, error: "missing_fleet" });
    return;
  }

  if (!platformAdminRequested && !VALID_FLEET_ROLES.has(role)) {
    res.status(400).json({ ok: false, error: "invalid_role" });
    return;
  }

  if (!platformAdminRequested && !fleetId && !auth.isAdmin) {
    res.status(403).json({ ok: false, error: "forbidden_fleet_scope" });
    return;
  }

  if (!platformAdminRequested && fleetId) {
    const provisioning = await assertCanProvisionFleetRole(auth, fleetId, role);
    if (provisioning !== "allowed") {
      res.status(403).json({ ok: false, error: provisioning });
      return;
    }
  }

  const admin = createClient(auth.env.url, auth.env.serviceRoleKey, {
    auth: { persistSession: false },
  });
  const provisionerKey = createHash("sha256")
    .update(auth.user.id)
    .digest("hex")
    .slice(0, 32);
  const { data: rateLimitData, error: rateLimitError } = await admin.rpc(
    "demo_check_rate_limit",
    {
      p_key: `admin_create_user:${provisionerKey}`,
      p_max_count: MAX_PROVISIONING_REQUESTS,
    },
  );
  const rateLimit = rateLimitData as {
    ok?: boolean;
    reset_at?: string;
  } | null;

  if (rateLimitError) {
    console.error("[admin/create-user] rate limit check failed:", rateLimitError.message);
    res.status(503).json({ ok: false, error: "rate_limit_check_failed" });
    return;
  }

  if (rateLimit?.ok !== true) {
    res.status(429).json({
      ok: false,
      error: "rate_limit_exceeded",
      reset_at: rateLimit?.reset_at,
    });
    return;
  }

  const password = generateTempPassword();
  const temporaryPasswordIssuedAt = new Date().toISOString();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      must_set_password: true,
      temporary_password_active: true,
      temporary_password_issued_at: temporaryPasswordIssuedAt,
    },
    user_metadata: {
      full_name: fullName || null,
      phone: phone || null,
      created_by_admin: auth.user.id,
    },
  });

  if (createError || !created.user) {
    const status = createError?.message?.toLowerCase().includes("already") ? 409 : 500;
    res.status(status).json({
      ok: false,
      error: status === 409 ? "user_already_exists" : "auth_create_failed",
    });
    return;
  }

  const userId = created.user.id;

  const { error: profileError } = await admin.from("profils").upsert(
    {
      user_id: userId,
      full_name: fullName || null,
      phone: phone || null,
      created_by: auth.user.id,
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    res.status(500).json({ ok: false, error: "profile_create_failed" });
    return;
  }

  if (platformAdminRequested) {
    const { error: adminProfileError } = await admin.from("admin_profiles").upsert(
      {
        user_id: userId,
        is_active: true,
        created_by: auth.user.id,
        internal_role: "admin",
        notes: "Created by super admin from admin users panel",
      },
      { onConflict: "user_id" },
    );

    if (adminProfileError) {
      await admin.auth.admin.deleteUser(userId);
      res.status(500).json({ ok: false, error: "admin_profile_create_failed" });
      return;
    }
  }

  if (!platformAdminRequested && fleetId) {
    const { error: membershipError } = await admin.from("flotte_adhesions").upsert(
      {
        fleet_id: fleetId,
        user_id: userId,
        role,
        is_active: true,
      },
      { onConflict: "fleet_id,user_id,role" },
    );

    if (membershipError) {
      await admin.auth.admin.deleteUser(userId);
      res.status(500).json({ ok: false, error: "membership_create_failed" });
      return;
    }
  }

  const publicAuth = createClient(auth.env.url, auth.env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const redirectTo = `${auth.env.appUrl.replace(/\/$/, "")}/set-password`;
  const { error: resetError } = await publicAuth.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (resetError) {
    console.error("[admin/create-user] reset password delivery failed:", resetError.message);
    await admin.auth.admin.deleteUser(userId);
    res.status(502).json({
      ok: false,
      error: "password_setup_email_failed",
    });
    return;
  }

  res.status(201).json({
    ok: true,
    user_id: userId,
    email,
    must_set_password: true,
    password_delivery: "reset_email",
  });
}
