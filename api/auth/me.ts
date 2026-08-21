/**
 * BFF Vercel : /api/auth/me
 *
 * Retourne le profil utilisateur authentifié et ses adhésions flotte.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyCors,
  getSupabaseEnv,
  handlePreflight,
  requireAuthenticatedUser,
} from "../_lib/vercel-api.js";

interface FleetMembership {
  fleet_id: string;
  role: string;
  fleet_name: string | null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const env = getSupabaseEnv();
  applyCors(req, res);
  if (handlePreflight(req, res)) return;

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
