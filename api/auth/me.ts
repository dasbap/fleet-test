import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import {
  applyCors,
  createAdminClient,
  handlePreflight,
  requireAuthenticatedUser,
} from "../_lib/vercel-api.js";

interface FleetMembership {
  fleet_id: string;
  role: string;
  fleet_name: string | null;
}

const passwordChangeSchema = z.object({
  password: z.string().min(8).max(256).optional(),
});

function normalizeBody(body: unknown): unknown {
  if (body === undefined || body === null || body === "") return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString("utf8"));
    } catch {
      return null;
    }
  }
  return body;
}

async function clearPasswordMarker(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const parsed = passwordChangeSchema.safeParse(normalizeBody(req.body));
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "invalid_password_length" });
    return;
  }

  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return;

  const { env, user } = auth;
  const appMetadata = user.app_metadata ?? {};
  const userMetadata = user.user_metadata ?? {};
  const mustSetPassword =
    appMetadata.must_set_password === true ||
    userMetadata.must_set_password === true;
  const temporaryPasswordActive =
    appMetadata.temporary_password_active === true ||
    userMetadata.temporary_password_active === true;
  const markerNeedsClearing = mustSetPassword || temporaryPasswordActive;
  const passwordSetAt = new Date().toISOString();

  if (!parsed.data.password && temporaryPasswordActive) {
    const temporaryPasswordIssuedAt =
      typeof appMetadata.temporary_password_issued_at === "string"
        ? Date.parse(appMetadata.temporary_password_issued_at)
        : Number.NaN;
    const userUpdatedAt = user.updated_at ? Date.parse(user.updated_at) : Number.NaN;

    if (
      !Number.isFinite(temporaryPasswordIssuedAt) ||
      !Number.isFinite(userUpdatedAt) ||
      userUpdatedAt <= temporaryPasswordIssuedAt
    ) {
      res.status(409).json({ ok: false, error: "password_change_required" });
      return;
    }
  }

  if (!markerNeedsClearing && !parsed.data.password) {
    res.status(200).json({
      ok: true,
      must_set_password: false,
      password_set_at: passwordSetAt,
    });
    return;
  }

  const admin = createAdminClient(env);
  const update: Parameters<typeof admin.auth.admin.updateUserById>[1] = {};

  if (parsed.data.password) update.password = parsed.data.password;
  if (markerNeedsClearing) {
    update.app_metadata = {
      ...appMetadata,
      must_set_password: false,
      temporary_password_active: false,
      password_set_at: passwordSetAt,
    };
    update.user_metadata = {
      ...userMetadata,
      must_set_password: false,
      temporary_password_active: false,
    };
  }

  const { data: updatedUserData, error: updateError } =
    await admin.auth.admin.updateUserById(user.id, update);

  if (updateError) {
    const code = updateError.code ?? (parsed.data.password ? "password_update_failed" : "password_marker_update_failed");
    const status = code === "same_password" || code === "weak_password" ? 400 : 409;
    res.status(status).json({ ok: false, error: code, details: updateError.message });
    return;
  }

  const updatedUser = updatedUserData.user;
  if (
    !updatedUser ||
    updatedUser.app_metadata?.must_set_password === true ||
    updatedUser.app_metadata?.temporary_password_active === true ||
    updatedUser.user_metadata?.must_set_password === true ||
    updatedUser.user_metadata?.temporary_password_active === true
  ) {
    res.status(500).json({ ok: false, error: "password_marker_not_cleared" });
    return;
  }

  res.status(200).json({
    ok: true,
    must_set_password: false,
    password_set_at: passwordSetAt,
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  applyCors(req, res);
  if (handlePreflight(req, res)) return;

  const operation = Array.isArray(req.query.operation)
    ? req.query.operation[0]
    : req.query.operation;

  if (operation === "clear-password-marker") {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "method_not_allowed" });
      return;
    }
    await clearPasswordMarker(req, res);
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const auth = await requireAuthenticatedUser(req, res);
  if (!auth) return;

  const { user, client } = auth;
  const { data: memberships, error: membershipErr } = await client
    .from("flotte_adhesions")
    .select("fleet_id, role, flottes(name)")
    .eq("user_id", user.id);

  if (membershipErr) {
    console.error("[bff/auth/me] Erreur adhésions:", membershipErr.message);
    res.status(500).json({ ok: false, error: "membership_fetch_failed" });
    return;
  }

  const fleets: FleetMembership[] = (memberships ?? []).map((row) => {
    const flotte = row.flottes as { name?: string } | null;
    return {
      fleet_id: row.fleet_id as string,
      role: row.role as string,
      fleet_name: flotte?.name ?? null,
    };
  });

  res.status(200).json({
    ok: true,
    user: {
      id: user.id,
      email: user.email ?? null,
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : null,
    },
    memberships: fleets,
    fleet_count: fleets.length,
  });
}
