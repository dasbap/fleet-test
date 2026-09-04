import type { Context, Hono } from "hono";
import { z } from "zod";
import { getAppUrl } from "../../env.js";
import { getBearerToken } from "../auth.js";
import { jsonInternalServerError } from "../errorResponse.js";
import { createSupabaseServiceClient } from "../../infra/supabaseServiceClient.js";
import { createSupabaseUserClient } from "../../infra/supabaseUserClient.js";

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
  origin: string | undefined | null,
): string {
  const trimmed = origin?.trim().replace(/\/$/, "") ?? "";
  if (process.env.NODE_ENV === "production") return getAppUrl();

  try {
    const url = new URL(trimmed);
    if (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.username === "" &&
      url.password === ""
    ) {
      return trimmed;
    }
  } catch {
    return getAppUrl();
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
        403,
      ),
    };
  }

  return { token, user, isSuperAdmin: Boolean(isSuperAdmin) };
}

async function createMagicLinkLocally(
  c: Context,
  body: z.infer<typeof generateMagicLinkSchema>,
  createdBy: string,
) {
  const admin = createSupabaseServiceClient();
  if (!admin) return jsonServerConfigurationError(c);

  const { data, error } = await admin.rpc("demo_create_magic_link", {
    p_user_id: body.user_id,
    p_fleet_id: body.fleet_id ?? null,
    p_email: body.email,
    p_label: body.label ?? null,
    p_expires_at: null,
    p_created_by: createdBy,
  });

  const result = data as { ok?: boolean; token?: string } | null;
  if (error || !result?.ok || !result.token) {
    console.error("[admin-demo] demo magic link creation failed:", error?.message);
    return c.json({ ok: false, error: "create_failed" }, 500);
  }

  const appUrl = resolveAppUrlFromOrigin(c.req.header("Origin"));
  return c.json({ ok: true, magic_url: `${appUrl}/demo/access?token=${result.token}` });
}

async function handleGenerateMagicLink(c: Context) {
  try {
    const auth = await requireLocalPlatformAdmin(c);
    if ("response" in auth) return auth.response;

    const rawBody = await readJson(c);
    if (rawBody instanceof Response) return rawBody;
    const parsed = generateMagicLinkSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ ok: false, error: "invalid_payload", details: parsed.error.flatten() }, 400);
    }

    return await createMagicLinkLocally(c, parsed.data, auth.user.id);
  } catch (error) {
    return jsonInternalServerError(c, error);
  }
}

async function handleValidateMagicLink(c: Context) {
  try {
    const rawBody = await readJson(c);
    if (rawBody instanceof Response) return rawBody;
    const parsed = validateMagicLinkSchema.safeParse(rawBody);
    if (!parsed.success) return c.json({ ok: false, error: "token_not_found" }, 404);

    const admin = createSupabaseServiceClient();
    if (!admin) return jsonServerConfigurationError(c);

    const { data, error } = await admin.rpc("demo_validate_magic_link", {
      p_token: parsed.data.token,
    });
    if (error) return c.json({ ok: false, error: "validation_error" }, 500);

    const result = data as { ok?: boolean; email?: string; fleet_id?: string } | null;
    if (!result?.ok || !result.email) {
      return c.json({ ok: false, error: "token_not_found" }, 404);
    }

    const appUrl = resolveAppUrlFromOrigin(c.req.header("Origin"));
    const { data: otpData, error: otpError } = await admin.auth.admin.generateLink({
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
    if (!token) return c.json({ ok: false, error: "missing_auth_token" }, 401);
    if (!hasSupabaseAuthConfig()) return jsonServerConfigurationError(c);

    const userClient = createSupabaseUserClient(token);
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser(token);
    if (authError || !user) return c.json({ ok: false, error: "invalid_token" }, 401);

    const admin = createSupabaseServiceClient();
    if (!admin) return jsonServerConfigurationError(c);

    const { data: currentUserData, error: currentUserError } =
      await admin.auth.admin.getUserById(user.id);
    if (currentUserError || !currentUserData.user) {
      return c.json({ ok: false, error: "user_not_found" }, 404);
    }

    const appMetadata = currentUserData.user.app_metadata ?? {};
    const temporaryPasswordActive = appMetadata.temporary_password_active === true;
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
      return c.json({ ok: false, error: "password_change_required" }, 409);
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
      console.error("[admin-demo] password marker update failed:", updateError?.message);
      return c.json({ ok: false, error: "password_marker_update_failed" }, 500);
    }

    const { data: verifiedUserData, error: verificationError } =
      await admin.auth.admin.getUserById(user.id);
    if (
      verificationError ||
      !verifiedUserData.user ||
      verifiedUserData.user.app_metadata?.must_set_password !== false
    ) {
      return c.json({ ok: false, error: "password_marker_not_cleared" }, 500);
    }

    return c.json({ ok: true, must_set_password: false });
  } catch (error) {
    return jsonInternalServerError(c, error);
  }
}

export function registerAdminDemoRoutes(app: Hono) {
  app.post("/api/admin/generate-magic-link", handleGenerateMagicLink);
  app.post("/api/demo/magic-link", handleValidateMagicLink);
  app.post("/api/auth/clear-password-marker", handleClearPasswordMarker);
}
