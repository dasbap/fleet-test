/**
 * BFF Vercel : /api/demo/create-access
 *
 * Crée un compte démo prospect + magic link en une requête (admin plateforme).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  applyCors,
  getSupabaseEnv,
  handlePreflight,
  requirePlatformAdmin,
} from "../_lib/vercel-api";

interface CreateAccessBody {
  email?: string;
  company_name?: string;
  trial_days?: number;
  label?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const env = getSupabaseEnv();
  applyCors(res, env.appUrl);
  if (handlePreflight(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const auth = await requirePlatformAdmin(req, res);
  if (!auth) return;

  const body = req.body as CreateAccessBody;
  const email = body?.email?.trim() ?? "";

  if (!email.includes("@")) {
    res.status(400).json({ ok: false, error: "invalid_email" });
    return;
  }

  if (!env.adminSecret || !env.url) {
    res.status(500).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  try {
    const prospectRes = await fetch(`${env.url}/functions/v1/create-prospect-account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.adminSecret}`,
      },
      body: JSON.stringify({
        email,
        company_name: body.company_name,
        trial_days: body.trial_days ?? 7,
        send_email: false,
        invited_by: auth.user.id,
      }),
    });

    const prospectData = (await prospectRes.json()) as Record<string, unknown>;

    if (prospectRes.status === 429) {
      res.status(429).json(prospectData);
      return;
    }
    if (!prospectRes.ok) {
      res.status(prospectRes.status).json(prospectData);
      return;
    }

    const userId = typeof prospectData.user_id === "string" ? prospectData.user_id : "";
    const fleetId = typeof prospectData.fleet_id === "string" ? prospectData.fleet_id : "";

    if (!userId || !fleetId) {
      res.status(502).json({ ok: false, error: "prospect_creation_incomplete" });
      return;
    }

    const magicRes = await fetch(`${env.url}/functions/v1/demo-magic-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.adminSecret}`,
      },
      body: JSON.stringify({
        action: "create",
        user_id: userId,
        fleet_id: fleetId,
        email,
        label: body.label ?? body.company_name ?? email,
      }),
    });

    const magicData = (await magicRes.json()) as Record<string, unknown>;

    if (magicRes.status === 429) {
      res.status(429).json(magicData);
      return;
    }
    if (!magicRes.ok) {
      res.status(magicRes.status).json(magicData);
      return;
    }

    console.log(`[bff/demo/create-access] Succès — admin: ${auth.user.id}, email: ${email}`);
    res.status(201).json({
      ok: true,
      user_id: userId,
      fleet_id: fleetId,
      email,
      trial_end: prospectData.trial_end ?? null,
      magic_url: magicData.magic_url ?? magicData.magic_link ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[bff/demo/create-access] fetch error:", message);
    res.status(500).json({ ok: false, error: message });
  }
}
