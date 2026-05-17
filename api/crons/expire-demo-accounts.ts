/**
 * Vercel Cron Route — expire-demo-accounts
 *
 * Planification : toutes les heures (voir vercel.json `crons`)
 * Rôle : proxy vers la Supabase Edge Function `expire-demo-accounts`
 *        qui gère le ban Auth + notifications (opérations impossibles depuis pg_cron).
 *
 * Sécurité : Vercel appelle cette route avec `Authorization: Bearer <CRON_SECRET>`.
 *            La route vérifie le secret avant de transmettre à Supabase.
 *
 * Variables Vercel :
 *   - CRON_SECRET             : même valeur que dans les secrets Supabase
 *   - VITE_SUPABASE_URL       : URL du projet Supabase
 *
 * Note : pg_cron gère déjà expire_demo_accounts_by_type() + notify_upcoming_expirations()
 *        directement en SQL. Cette Edge Function ajoute uniquement le ban Supabase Auth.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

const CRON_SECRET   = process.env.CRON_SECRET ?? "";
const SUPABASE_URL  = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Vercel Cron envoie Authorization: Bearer <CRON_SECRET>
  const auth  = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!CRON_SECRET || token !== CRON_SECRET) {
    console.error("[cron/expire-demo-accounts] Unauthorized");
    res.status(401).json({ ok: false, error: "unauthorized" });
    return;
  }

  if (!SUPABASE_URL) {
    console.error("[cron/expire-demo-accounts] SUPABASE_URL manquant");
    res.status(500).json({ ok: false, error: "configuration_error" });
    return;
  }

  const edgeFnUrl = `${SUPABASE_URL}/functions/v1/expire-demo-accounts`;

  try {
    const upstream = await fetch(edgeFnUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ secret: CRON_SECRET }),
    });

    const data = await upstream.json() as Record<string, unknown>;

    if (!upstream.ok) {
      console.error("[cron/expire-demo-accounts] Edge Function error:", data);
      res.status(upstream.status).json({ ok: false, upstream: data });
      return;
    }

    console.log("[cron/expire-demo-accounts] OK:", JSON.stringify(data));
    res.status(200).json({ ok: true, upstream: data });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/expire-demo-accounts] fetch error:", message);
    res.status(500).json({ ok: false, error: message });
  }
}
