import type { Context, Hono } from "hono";
import { z } from "zod";
import { createSupabaseServiceClient } from "../../infra/supabaseServiceClient.js";
import { createSupabaseUserClient } from "../../infra/supabaseUserClient.js";
import { getBearerToken } from "../auth.js";

const passwordChangeSchema = z.object({
  password: z.string().min(8).max(256),
});

const MARKER_UPDATE_ATTEMPTS = 3;
const SUPABASE_AUTH_TIMEOUT_MS = 12_000;

class UpstreamTimeoutError extends Error {
  constructor(label: string) {
    super(`${label}_timeout`);
    this.name = "UpstreamTimeoutError";
  }
}

async function withSupabaseTimeout<T>(operation: PromiseLike<T>, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new UpstreamTimeoutError(label)), SUPABASE_AUTH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function handlePasswordChange(c: Context) {
  try {
    const token = getBearerToken(c.req.header("Authorization"));
    if (!token) return c.json({ ok: false, error: "missing_auth_token" }, 401);

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "invalid_json" }, 400);
    }

    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) return c.json({ ok: false, error: "invalid_password_length" }, 400);

    const userClient = createSupabaseUserClient(token);
    const {
      data: { user },
      error: authError,
    } = await withSupabaseTimeout(userClient.auth.getUser(token), "user_lookup");

    if (authError || !user) return c.json({ ok: false, error: "invalid_token" }, 401);

    const admin = createSupabaseServiceClient();
    if (!admin) return c.json({ ok: false, error: "server_configuration_error" }, 503);

    const { data: currentUserData, error: currentUserError } = await withSupabaseTimeout(
      admin.auth.admin.getUserById(user.id),
      "current_user_lookup",
    );

    if (currentUserError || !currentUserData.user) return c.json({ ok: false, error: "user_not_found" }, 404);

    const appMetadata = currentUserData.user.app_metadata ?? {};
    const userMetadata = currentUserData.user.user_metadata ?? {};
    const mustSetPassword = appMetadata.must_set_password === true || userMetadata.must_set_password === true;
    const temporaryPasswordActive = appMetadata.temporary_password_active === true || userMetadata.temporary_password_active === true;

    if (!mustSetPassword && !temporaryPasswordActive) return c.json({ ok: true, must_set_password: false });

    const { error: passwordUpdateError } = await withSupabaseTimeout(
      userClient.auth.updateUser({ password: parsed.data.password }),
      "password_update",
    );

    if (passwordUpdateError) {
      const code = passwordUpdateError.code ?? "password_update_failed";
      const status = code === "same_password" || code === "weak_password" ? 400 : 409;
      return c.json({ ok: false, error: code, details: passwordUpdateError.message }, status);
    }

    const passwordSetAt = new Date().toISOString();
    let markerUpdated = false;

    for (let attempt = 0; attempt < MARKER_UPDATE_ATTEMPTS; attempt += 1) {
      const { data: updatedUserData, error: updateError } = await withSupabaseTimeout(
        admin.auth.admin.updateUserById(user.id, {
          app_metadata: {
            ...appMetadata,
            must_set_password: false,
            temporary_password_active: false,
            password_set_at: passwordSetAt,
          },
          user_metadata: {
            ...userMetadata,
            must_set_password: false,
            temporary_password_active: false,
          },
        }),
        "password_marker_update",
      );

      if (!updateError && updatedUserData.user) {
        markerUpdated = true;
        break;
      }
    }

    if (!markerUpdated) return c.json({ ok: false, error: "password_marker_update_failed" }, 500);

    const { data: verifiedUserData, error: verificationError } = await withSupabaseTimeout(
      admin.auth.admin.getUserById(user.id),
      "password_marker_verification",
    );

    if (
      verificationError ||
      !verifiedUserData.user ||
      verifiedUserData.user.app_metadata?.must_set_password === true ||
      verifiedUserData.user.app_metadata?.temporary_password_active === true ||
      verifiedUserData.user.user_metadata?.must_set_password === true ||
      verifiedUserData.user.user_metadata?.temporary_password_active === true
    ) {
      return c.json({ ok: false, error: "password_marker_not_cleared" }, 500);
    }

    return c.json({ ok: true, must_set_password: false, password_set_at: passwordSetAt });
  } catch (error) {
    if (error instanceof UpstreamTimeoutError) return c.json({ ok: false, error: "upstream_timeout" }, 504);
    throw error;
  }
}

export function registerPasswordChangeRoutes(app: Hono) {
  app.post("/api/auth/clear-password-marker", handlePasswordChange);
}
