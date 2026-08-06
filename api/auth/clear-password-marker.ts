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

    const { error } = await admin.auth.admin.updateUserById(auth.user.id, {
      app_metadata: {
        ...auth.user.app_metadata,
        must_set_password: false,
      },
    });

    if (error) {
      console.error(
        "[bff/auth/clear-password-marker] update failed:",
        error.message
      );

      res.status(500).json({
        ok: false,
        error: "password_marker_update_failed",
      });

      return;
    }

    res.status(200).json({
      ok: true,
    });
  } catch (error) {
    console.error("[bff/auth/clear-password-marker] unexpected error:", error);

    res.status(500).json({
      ok: false,
      error: "internal_server_error",
    });
  }
}
