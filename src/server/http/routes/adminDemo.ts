import type { Context, Hono } from "hono";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { getAppUrl, getSupabaseUrl } from "../../env.js";
import { getBearerToken } from "../auth.js";
import { jsonInternalServerError } from "../errorResponse.js";
import { createSupabaseServiceClient } from "../../infra/supabaseServiceClient.js";
import { createSupabaseUserClient } from "../../infra/supabaseUserClient.js";

const createProspectSchema = z.object({
  email: z.string().email(),
  company_name: z.string().trim().min(1).optional(),
  account_type: z.enum(["prospect", "investor", "internal", "dev"]).optional(),
  fleet_id: z.string().uuid().optional(),
  trial_days: z.number().int().positive().max(31).optional(),
  send_email: z.boolean().optional(),
  permanent_access: z.boolean().optional(),
});

const generateMagicLinkSchema = z.object({
  user_id: z.string().uuid(),
  fleet_id: z.string().uuid().nullable().optional(),
  email: z.string().email(),
  label: z.string().trim().min(1).optional(),
});

const validateMagicLinkSchema = z.object({
  action: z.literal("validate"),
  token: z.string().uuid(),
});

function getAdminSecret(): string | undefined {
  return process.env.ADMIN_SECRET?.trim() || undefined;
}

export function generateSecureTempPassword(): string {
  const words = ["Samba", "Route", "Flotte", "Camion", "Cargo", "Africa"];
  const symbols = ["!", "@", "#", "$", "%"];
  const word = words[randomInt(words.length)];
  const suffix = randomInt(100_000_000, 1_000_000_000);
  const symbol = symbols[randomInt(symbols.length)];
  return `${word}${suffix}${symbol}`;
}

function hasSupabaseAuthConfig(): boolean {
  const url =
    process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const anonKey =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && anonKey);
}

function jsonServerConfigurationError(c: Context) {
  return c.json({ ok: false, error: "server_configuration_error" }, 503);
}

export function resolveAppUrlFromOrigin(
  origin: string | undefined | null
): string {
  const trimmed = origin?.trim().replace(/\/$/, "") ?? "";
  if (
    trimmed.startsWith("http://localhost:") ||
    trimmed.startsWith("http://127.0.0.1:")
  ) {
    return trimmed;
  }
  return getAppUrl();
}

async function readJson(c: Context): Promise<unknown | Response> {
  try {
    return await c.req.json();
  } catch {
    return c.json({ ok: false, error: "invalid_json" }, 400);
  }
}

async function requireLocalPlatformAdmin(c: Context) {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) {
    return {
      response: c.json({ ok: false, error: "missing_auth_token" }, 401),
    };
  }

  if (!hasSupabaseAuthConfig()) {
    return { response: jsonServerConfigurationError(c) };
  }

  const client = createSupabaseUserClient(token);
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
  if (!isAdmin) {
    return {
      response: c.json(
        { ok: false, error: "forbidden_not_platform_admin" },
        403
      ),
    };
  }

  return { token, user, isSuperAdmin: Boolean(isSuperAdmin) };
}

async function forwardJson(
  c: Context,
  endpoint: "create-prospect-account" | "demo-magic-link",
  body: Record<string, unknown>
) {
  const adminSecret = getAdminSecret();
  if (!adminSecret) {
    return jsonServerConfigurationError(c);
  }

  const upstream = await fetch(`${getSupabaseUrl()}/functions/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminSecret}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await upstream.json()) as Record<string, unknown>;
  return c.json(data, upstream.status as Parameters<typeof c.json>[1]);
}

async function createProspectLocally(
  c: Context,
  body: z.infer<typeof createProspectSchema>,
  invitedBy: string
) {
  const admin = createSupabaseServiceClient();

  if (!admin) {
    return jsonServerConfigurationError(c);
  }

  const email = body.email.trim().toLowerCase();
  const tempPassword = generateSecureTempPassword();
  const temporaryPasswordIssuedAt = new Date().toISOString();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        must_set_password: true,
        temporary_password_active: true,
        temporary_password_issued_at: temporaryPasswordIssuedAt,
      },
      user_metadata: {
        account_type: body.account_type ?? "prospect",
        company_name: body.company_name ?? null,
        trial_days: body.trial_days ?? 7,
        permanent_access: body.permanent_access === true,
        created_by_demo: true,
      },
    });

  if (authError || !authData.user) {
    return c.json(
      {
        ok: false,
        error: authError?.message ?? "auth_create_failed",
      },
      500
    );
  }

  const userId = authData.user.id;

  const { data: markerData, error: markerError } =
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...authData.user.app_metadata,
        must_set_password: true,
        temporary_password_active: true,
        temporary_password_issued_at: temporaryPasswordIssuedAt,
      },
    });

  if (markerError || markerData.user.app_metadata?.must_set_password !== true) {
    await admin.auth.admin.deleteUser(userId);

    return c.json(
      {
        ok: false,
        error: markerError?.message ?? "must_set_password_not_persisted",
      },
      500
    );
  }

  const { data: registrationData, error: registrationError } = await admin.rpc(
    "prospect_create_account",
    {
      p_user_id: userId,
      p_email: email,
      p_company_name: body.company_name ?? null,
      p_invited_by: invitedBy,
      p_fleet_id: body.fleet_id ?? null,
      p_trial_days: body.trial_days ?? 7,
      p_account_type: body.account_type ?? "prospect",
      p_permanent_access: body.permanent_access === true,
    }
  );

  if (registrationError) {
    await admin.auth.admin.deleteUser(userId);

    return c.json(
      {
        ok: false,
        error: registrationError.message,
      },
      500
    );
  }

  const registration = registrationData as {
    ok?: boolean;
    fleet_id?: string;
    trial_end?: string;
    error?: string;
  } | null;

  if (!registration?.ok) {
    await admin.auth.admin.deleteUser(userId);

    return c.json(
      {
        ok: false,
        error: registration?.error ?? "registration_failed",
      },
      500
    );
  }

  const { data: verifiedUser, error: verificationError } =
    await admin.auth.admin.getUserById(userId);

  if (
    verificationError ||
    verifiedUser.user.app_metadata?.must_set_password !== true
  ) {
    await admin.auth.admin.deleteUser(userId);

    return c.json(
      {
        ok: false,
        error: "must_set_password_verification_failed",
      },
      500
    );
  }

  const appUrl = resolveAppUrlFromOrigin(c.req.header("Origin"));

  if (body.send_email) {
    const { error: notificationError } = await admin
      .from("notification_queue")
      .insert({
        to_email: email,
        template_id: "prospect_welcome",
        metadata: {
          company_name: body.company_name ?? email,
          trial_days: body.trial_days ?? 7,
          trial_end: registration.trial_end,
          permanent_access: body.permanent_access === true,
          login_url: appUrl,
          temp_password: tempPassword,
        },
        status: "pending",
        created_at: new Date().toISOString(),
      });

    if (notificationError) {
      console.error(
        "[admin-demo] notification queue failed:",
        notificationError.message
      );
    }
  }

  return c.json(
    {
      ok: true,
      user_id: userId,
      email,
      fleet_id: registration.fleet_id ?? null,
      trial_end: registration.trial_end,
      permanent_access: body.permanent_access === true,
      login_url:
        `${appUrl}/auth?email=${encodeURIComponent(email)}` + "&prospect=1",
      must_set_password: true,
      function_version: "admin-demo-local-v2",
      ...(body.send_email
        ? {}
        : {
            temp_password: tempPassword,
          }),
    },
    201
  );
}
async function createMagicLinkLocally(
  c: Context,
  body: z.infer<typeof generateMagicLinkSchema>,
  createdBy: string
) {
  const admin = createSupabaseServiceClient();
  if (!admin) {
    return jsonServerConfigurationError(c);
  }

  const { data, error } = await admin.rpc("demo_create_magic_link", {
    p_user_id: body.user_id,
    p_fleet_id: body.fleet_id ?? null,
    p_email: body.email,
    p_label: body.label ?? null,
    p_expires_at: null,
    p_created_by: createdBy,
  });

  const result = data as {
    ok?: boolean;
    token?: string;
    error?: string;
  } | null;
  if (error || !result?.ok || !result.token) {
    return c.json(
      { ok: false, error: error?.message ?? result?.error ?? "create_failed" },
      500
    );
  }

  const appUrl = resolveAppUrlFromOrigin(c.req.header("Origin"));
  return c.json({
    ok: true,
    magic_url: `${appUrl}/demo/access?token=${result.token}`,
  });
}

async function handleCreateProspect(c: Context) {
  try {
    const auth = await requireLocalPlatformAdmin(c);
    if ("response" in auth) return auth.response;

    const rawBody = await readJson(c);
    if (rawBody instanceof Response) return rawBody;
    const parsed = createProspectSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        {
          ok: false,
          error: "invalid_payload",
          details: parsed.error.flatten(),
        },
        400
      );
    }
    if (parsed.data.permanent_access && !auth.isSuperAdmin) {
      return c.json(
        { ok: false, error: "forbidden_super_admin_required" },
        403
      );
    }

    const forwardBody = {
      email: parsed.data.email,
      company_name: parsed.data.company_name,
      account_type: parsed.data.account_type ?? "prospect",
      fleet_id: null,
      trial_days: parsed.data.trial_days ?? 7,
      send_email: parsed.data.send_email ?? false,
      permanent_access: parsed.data.permanent_access === true,
      invited_by: auth.user.id,
    };

    if (!getAdminSecret()) {
      return await createProspectLocally(c, parsed.data, auth.user.id);
    }

    return await forwardJson(c, "create-prospect-account", forwardBody);
  } catch (error) {
    return jsonInternalServerError(c, error);
  }
}

async function handleGenerateMagicLink(c: Context) {
  try {
    const auth = await requireLocalPlatformAdmin(c);
    if ("response" in auth) return auth.response;

    const rawBody = await readJson(c);
    if (rawBody instanceof Response) return rawBody;
    const parsed = generateMagicLinkSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        {
          ok: false,
          error: "invalid_payload",
          details: parsed.error.flatten(),
        },
        400
      );
    }

    const forwardBody = {
      action: "create",
      user_id: parsed.data.user_id,
      fleet_id: parsed.data.fleet_id ?? null,
      email: parsed.data.email,
      label: parsed.data.label,
    };

    if (!getAdminSecret()) {
      return await createMagicLinkLocally(c, parsed.data, auth.user.id);
    }

    return await forwardJson(c, "demo-magic-link", forwardBody);
  } catch (error) {
    return jsonInternalServerError(c, error);
  }
}

async function handleValidateMagicLink(c: Context) {
  try {
    const rawBody = await readJson(c);
    if (rawBody instanceof Response) return rawBody;
    const parsed = validateMagicLinkSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ ok: false, error: "token_not_found" }, 404);
    }

    const admin = createSupabaseServiceClient();
    if (!admin) {
      return jsonServerConfigurationError(c);
    }

    const { data, error } = await admin.rpc("demo_validate_magic_link", {
      p_token: parsed.data.token,
    });

    if (error) {
      return c.json({ ok: false, error: "validation_error" }, 500);
    }

    const result = data as {
      ok?: boolean;
      email?: string;
      fleet_id?: string;
      error?: string;
    } | null;

    if (!result?.ok || !result.email) {
      return c.json(
        { ok: false, error: result?.error ?? "token_not_found" },
        404
      );
    }

    const appUrl = resolveAppUrlFromOrigin(c.req.header("Origin"));
    const { data: otpData, error: otpError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: result.email,
        options: { redirectTo: `${appUrl}/demo/onboarding` },
      });

    if (otpError || !otpData?.properties?.action_link) {
      return c.json({ ok: false, error: "auth_link_failed" }, 500);
    }

    return c.json({
      ok: true,
      magic_link: otpData.properties.action_link,
      fleet_id: result.fleet_id,
    });
  } catch (error) {
    return jsonInternalServerError(c, error);
  }
}

async function handleClearPasswordMarker(c: Context) {
  try {
    const token = getBearerToken(c.req.header("Authorization"));

    if (!token) {
      return c.json(
        {
          ok: false,
          error: "missing_auth_token",
        },
        401
      );
    }

    if (!hasSupabaseAuthConfig()) {
      return jsonServerConfigurationError(c);
    }

    const userClient = createSupabaseUserClient(token);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser(token);

    if (authError || !user) {
      return c.json(
        {
          ok: false,
          error: "invalid_token",
        },
        401
      );
    }

    const admin = createSupabaseServiceClient();

    if (!admin) {
      return jsonServerConfigurationError(c);
    }

    const { data: currentUserData, error: currentUserError } =
      await admin.auth.admin.getUserById(user.id);

    if (currentUserError || !currentUserData.user) {
      return c.json(
        {
          ok: false,
          error: "user_not_found",
        },
        404
      );
    }

    const appMetadata = currentUserData.user.app_metadata ?? {};
    const temporaryPasswordActive =
      appMetadata.temporary_password_active === true;
    const temporaryPasswordIssuedAt =
      typeof appMetadata.temporary_password_issued_at === "string"
        ? Date.parse(appMetadata.temporary_password_issued_at)
        : Number.NaN;
    const userUpdatedAt = currentUserData.user.updated_at
      ? Date.parse(currentUserData.user.updated_at)
      : Number.NaN;

    if (
      temporaryPasswordActive &&
      (!Number.isFinite(temporaryPasswordIssuedAt) ||
        !Number.isFinite(userUpdatedAt) ||
        userUpdatedAt <= temporaryPasswordIssuedAt)
    ) {
      return c.json(
        {
          ok: false,
          error: "password_change_required",
        },
        409
      );
    }

    const { data: updatedUserData, error: updateError } =
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          ...appMetadata,
          must_set_password: false,
          temporary_password_active: false,
        },
      });

    if (updateError || !updatedUserData.user) {
      return c.json(
        {
          ok: false,
          error: "password_marker_update_failed",
          details: updateError?.message,
        },
        500
      );
    }

    const { data: verifiedUserData, error: verificationError } =
      await admin.auth.admin.getUserById(user.id);

    if (
      verificationError ||
      !verifiedUserData.user ||
      verifiedUserData.user.app_metadata?.must_set_password !== false
    ) {
      return c.json(
        {
          ok: false,
          error: "password_marker_not_cleared",
        },
        500
      );
    }

    return c.json({
      ok: true,
      must_set_password: false,
    });
  } catch (error) {
    return jsonInternalServerError(c, error);
  }
}

interface AdminAccountRow {
  user_id: string;
  email: string;
  full_name: string | null;
  account_type: string | null;
  role: string | null;
  fleet_id: string | null;
  fleet_name: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  expiration_source: "demo" | "subscription" | null;
  must_set_password: boolean;
  is_platform_admin: boolean;
  is_super_admin: boolean;
}

export function registerAdminDemoRoutes(app: Hono) {
  app.post("/api/admin/create-prospect", handleCreateProspect);

  app.post("/api/admin/generate-magic-link", handleGenerateMagicLink);

  app.post("/api/demo/magic-link", handleValidateMagicLink);

  app.post("/api/auth/clear-password-marker", handleClearPasswordMarker);
}
