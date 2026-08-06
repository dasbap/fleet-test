import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  applyCors,
  createAdminClient,
  getSupabaseEnv,
  handlePreflight,
  requireAuthenticatedUser,
} from "../_lib/vercel-api";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const env = getSupabaseEnv();

  applyCors(res, env.appUrl);

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

    const { data: updatedUserData, error: updateError } =
      await admin.auth.admin.updateUserById(auth.user.id, {
        app_metadata: {
          ...currentUserData.user.app_metadata,
          must_set_password: false,
        },
      });

    if (updateError || !updatedUserData.user) {
      console.error(
        "[bff/auth/clear-password-marker] update failed:",
        updateError?.message
      );

      res.status(500).json({
        ok: false,
        error: "password_marker_update_failed",
        details: updateError?.message,
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

    const mustSetPassword =
      verifiedUserData.user.app_metadata?.must_set_password;

    if (mustSetPassword !== false) {
      console.error(
        "[bff/auth/clear-password-marker] marker still present:",
        mustSetPassword
      );

      res.status(500).json({
        ok: false,
        error: "password_marker_not_cleared",
      });

      return;
    }

    res.status(200).json({
      ok: true,
      must_set_password: false,
    });
  } catch (error) {
    console.error("[bff/auth/clear-password-marker] unexpected error:", error);

    res.status(500).json({
      ok: false,
      error: "internal_server_error",
    });
  }
}
