import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  applyCors,
  createAdminClient,
  handlePreflight,
  requireAuthenticatedUser,
} from "../_lib/vercel-api.js";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 256;
const MARKER_UPDATE_ATTEMPTS = 3;

function readPassword(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "";
  }

  const value = (body as Record<string, unknown>).password;
  return typeof value === "string" ? value : "";
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  applyCors(req, res);

  if (handlePreflight(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });

    return;
  }

  const auth = await requireAuthenticatedUser(req, res);

  if (!auth) {
    return;
  }

  if (!auth.env.url || !auth.env.serviceRoleKey) {
    res.status(500).json({
      ok: false,
      error: "missing_server_configuration",
    });

    return;
  }

  const password = readPassword(req.body);

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    res.status(400).json({
      ok: false,
      error: "invalid_password_length",
    });

    return;
  }

  try {
    const admin = createAdminClient(auth.env);

    const { data: currentUserData, error: currentUserError } =
      await admin.auth.admin.getUserById(auth.user.id);

    if (currentUserError || !currentUserData.user) {
      console.error(
        "[bff/auth/clear-password-marker] user lookup failed:",
        currentUserError?.message
      );

      res.status(404).json({
        ok: false,
        error: "user_not_found",
      });

      return;
    }

    const appMetadata = currentUserData.user.app_metadata ?? {};
    const userMetadata = currentUserData.user.user_metadata ?? {};
    const mustSetPassword =
      appMetadata.must_set_password === true ||
      userMetadata.must_set_password === true;
    const temporaryPasswordActive =
      appMetadata.temporary_password_active === true ||
      userMetadata.temporary_password_active === true;

    if (!mustSetPassword && !temporaryPasswordActive) {
      res.status(200).json({
        ok: true,
        must_set_password: false,
      });

      return;
    }

    const { error: passwordUpdateError } = await auth.client.auth.updateUser({
      password,
    });

    if (passwordUpdateError) {
      const code = passwordUpdateError.code ?? "password_update_failed";
      const status = code === "same_password" || code === "weak_password" ? 400 : 409;

      res.status(status).json({
        ok: false,
        error: code,
        details: passwordUpdateError.message,
      });

      return;
    }

    const passwordSetAt = new Date().toISOString();
    let markerUpdated = false;

    for (let attempt = 0; attempt < MARKER_UPDATE_ATTEMPTS; attempt += 1) {
      const { data: updatedUserData, error: updateError } =
        await admin.auth.admin.updateUserById(auth.user.id, {
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
        });

      if (!updateError && updatedUserData.user) {
        markerUpdated = true;
        break;
      }
    }

    if (!markerUpdated) {
      res.status(500).json({
        ok: false,
        error: "password_marker_update_failed",
      });

      return;
    }

    const { data: verifiedUserData, error: verificationError } =
      await admin.auth.admin.getUserById(auth.user.id);

    if (verificationError || !verifiedUserData.user) {
      console.error(
        "[bff/auth/clear-password-marker] verification failed:",
        verificationError?.message
      );

      res.status(500).json({
        ok: false,
        error: "password_marker_verification_failed",
      });

      return;
    }

    if (
      verifiedUserData.user.app_metadata?.must_set_password === true ||
      verifiedUserData.user.app_metadata?.temporary_password_active === true ||
      verifiedUserData.user.user_metadata?.must_set_password === true ||
      verifiedUserData.user.user_metadata?.temporary_password_active === true
    ) {
      res.status(500).json({
        ok: false,
        error: "password_marker_not_cleared",
      });

      return;
    }

    res.status(200).json({
      ok: true,
      must_set_password: false,
      password_set_at: passwordSetAt,
    });
  } catch (error) {
    console.error("[bff/auth/clear-password-marker] unexpected error:", error);

    res.status(500).json({
      ok: false,
      error: "internal_server_error",
    });
  }
}
