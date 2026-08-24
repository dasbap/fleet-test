import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Context, Hono, Next } from "hono";
import { z } from "zod";
import { getAppUrl, getSupabaseAnonKey, getSupabaseUrl } from "../../env.js";
import { createSupabaseServiceClient } from "../../infra/supabaseServiceClient.js";
import { createSupabaseUserClient } from "../../infra/supabaseUserClient.js";
import { getBearerToken } from "../auth.js";

const createProspectSchema = z.object({
  email: z.string().email().max(320),
  company_name: z.string().trim().min(1).max(200).optional(),
  account_type: z.enum(["prospect", "investor", "internal", "dev"]).optional(),
  fleet_id: z.string().uuid().optional(),
  trial_days: z.number().int().positive().max(31).optional(),
  send_email: z.boolean().optional(),
  permanent_access: z.boolean().optional(),
});

function generateTemporaryPassword(): string {
  return randomBytes(18).toString("base64url");
}

async function requirePlatformAdmin(c: Context) {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) {
    return { response: c.json({ ok: false, error: "missing_auth_token" }, 401) };
  }

  let client;
  try {
    client = createSupabaseUserClient(token);
  } catch {
    return { response: c.json({ ok: false, error: "server_configuration_error" }, 503) };
  }

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser(token);

  if (authError || !user) {
    return { response: c.json({ ok: false, error: "invalid_token" }, 401) };
  }

  const [{ data: isAdmin }, { data: isSuperAdmin }] = await Promise.all([
    client.rpc("is_platform_admin"),
    client.rpc("is_platform_super_admin"),
  ]);

  if (isAdmin !== true) {
    return { response: c.json({ ok: false, error: "forbidden_not_platform_admin" }, 403) };
  }

  return { user, isSuperAdmin: isSuperAdmin === true };
}

async function handleSecureLocalProspect(c: Context) {
  const auth = await requirePlatformAdmin(c);
  if ("response" in auth) return auth.response;

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "invalid_json" }, 400);
  }

  const parsed = createProspectSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json({ ok: false, error: "invalid_payload", details: parsed.error.flatten() }, 400);
  }

  if (parsed.data.permanent_access === true && !auth.isSuperAdmin) {
    return c.json({ ok: false, error: "forbidden_super_admin_required" }, 403);
  }

  const admin = createSupabaseServiceClient();
  if (!admin) {
    return c.json({ ok: false, error: "server_configuration_error" }, 503);
  }

  const email = parsed.data.email.trim().toLowerCase();
  const temporaryPassword = generateTemporaryPassword();
  const temporaryPasswordIssuedAt = new Date().toISOString();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    app_metadata: {
      must_set_password: true,
      temporary_password_active: true,
      temporary_password_issued_at: temporaryPasswordIssuedAt,
    },
    user_metadata: {
      account_type: parsed.data.account_type ?? "prospect",
      company_name: parsed.data.company_name ?? null,
      trial_days: parsed.data.trial_days ?? 7,
      permanent_access: parsed.data.permanent_access === true,
      created_by_demo: true,
    },
  });

  if (authError || !authData.user) {
    return c.json({ ok: false, error: "auth_create_failed" }, 500);
  }

  const userId = authData.user.id;
  const { data: registrationData, error: registrationError } = await admin.rpc(
    "prospect_create_account",
    {
      p_user_id: userId,
      p_email: email,
      p_company_name: parsed.data.company_name ?? null,
      p_invited_by: auth.user.id,
      p_fleet_id: parsed.data.fleet_id ?? null,
      p_trial_days: parsed.data.trial_days ?? 7,
      p_account_type: parsed.data.account_type ?? "prospect",
      p_permanent_access: parsed.data.permanent_access === true,
    },
  );

  const registration = registrationData as {
    ok?: boolean;
    fleet_id?: string;
    trial_end?: string;
  } | null;

  if (registrationError || !registration?.ok) {
    await admin.auth.admin.deleteUser(userId);
    return c.json({ ok: false, error: "registration_failed" }, 500);
  }

  const publicAuth = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: resetError } = await publicAuth.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/set-password`,
  });

  if (resetError) {
    await admin.auth.admin.deleteUser(userId);
    return c.json({ ok: false, error: "password_setup_email_failed" }, 502);
  }

  if (parsed.data.send_email) {
    const { error: notificationError } = await admin.from("notification_queue").insert({
      to_email: email,
      template_id: "prospect_welcome",
      metadata: {
        company_name: parsed.data.company_name ?? email,
        trial_days: parsed.data.trial_days ?? 7,
        trial_end: registration.trial_end,
        permanent_access: parsed.data.permanent_access === true,
        login_url: getAppUrl(),
      },
      status: "pending",
      created_at: new Date().toISOString(),
    });

    if (notificationError) {
      console.error("[admin-prospect-security] welcome notification failed:", notificationError.message);
    }
  }

  return c.json(
    {
      ok: true,
      user_id: userId,
      email,
      fleet_id: registration.fleet_id ?? null,
      trial_end: registration.trial_end,
      permanent_access: parsed.data.permanent_access === true,
      login_url: `${getAppUrl()}/auth?email=${encodeURIComponent(email)}&prospect=1`,
      must_set_password: true,
      password_delivery: "reset_email",
      function_version: "admin-demo-local-v3",
    },
    201,
  );
}

async function secureLocalProspectOverride(c: Context, next: Next) {
  if (process.env.ADMIN_SECRET?.trim()) {
    await next();
    return;
  }

  return handleSecureLocalProspect(c);
}

export function registerAdminProspectSecurityRoutes(app: Hono) {
  app.post("/api/admin/create-prospect", secureLocalProspectOverride);
}
