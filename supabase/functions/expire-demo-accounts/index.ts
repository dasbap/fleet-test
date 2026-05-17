/**
 * Edge Function : expire-demo-accounts
 *
 * Cron horaire (toutes les heures) — gestion du cycle de vie des comptes démo par type.
 *
 * Types et durées :
 *   investor  → 48h  (bannissement Auth inclus)
 *   prospect  → 7j   (délégué à expire-prospect-accounts pour le flow RLS)
 *   internal  → permanent (ignoré)
 *   dev       → permanent (ignoré)
 *
 * Étapes :
 *   1. expire_demo_accounts_by_type()  → marque is_active=false
 *   2. Ban Supabase Auth pour les comptes expirés depuis < 10 min
 *   3. notify_upcoming_expirations(24) → queue emails J-1
 *   4. Audit log résumé
 *
 * Variables ENV :
 *   - CRON_SECRET
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CRON_SECRET      = Deno.env.get("CRON_SECRET") ?? "";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RpcResult {
  ok:               boolean;
  expired_count?:   number;
  notified_count?:  number;
  errors?:          string[];
  error?:           string;
}

interface JustExpiredProfile {
  user_id:      string;
  email:        string;
  account_type: string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Auth cron
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch { /* body vide */ }

  const token = (body.secret as string | undefined)?.trim() ?? "";
  if (!CRON_SECRET || token !== CRON_SECRET) {
    console.error("[expire-demo-accounts] Unauthorized");
    return new Response("Unauthorized", { status: 401 });
  }

  const admin    = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const runId      = crypto.randomUUID();
  const startedAt  = new Date().toISOString();

  console.log(`[expire-demo-accounts] Run ${runId}`);

  const summary = {
    runId,
    startedAt,
    expiredCount:    0,
    authBannedCount: 0,
    notifiedCount:   0,
    errors:          [] as string[],
  };

  try {
    // ── 1. Expirer les comptes dont expires_at < now() ────────────────────
    const { data: expireData, error: expireErr } = await admin
      .rpc("expire_demo_accounts_by_type");

    if (expireErr) {
      summary.errors.push(`expire_demo_accounts_by_type: ${expireErr.message}`);
      console.error("[expire-demo-accounts] expire error:", expireErr.message);
    } else {
      const res = expireData as RpcResult;
      summary.expiredCount = res.expired_count ?? 0;
      if (res.errors?.length) {
        summary.errors.push(...res.errors);
      }
      console.log(`[expire-demo-accounts] Expired: ${summary.expiredCount}`);
    }

    // ── 2. Bannir dans Supabase Auth les comptes expirés < 10 min ────────
    // Fenêtre de 10 min pour éviter de re-bannir à chaque cron
    const { data: toBan } = await admin
      .from("demo_profiles")
      .select("user_id, email, account_type")
      .eq("is_active", false)
      .not("deactivated_at", "is", null)
      .gte("deactivated_at", new Date(Date.now() - 10 * 60_000).toISOString());

    const profiles = (toBan ?? []) as JustExpiredProfile[];

    for (const profile of profiles) {
      try {
        const { error: banErr } = await admin.auth.admin.updateUserById(
          profile.user_id,
          { ban_duration: "876600h" }, // ~100 ans = ban effectif permanent
        );
        if (banErr) {
          summary.errors.push(`ban ${profile.user_id}: ${banErr.message}`);
        } else {
          summary.authBannedCount++;
          console.log(`[expire-demo-accounts] Banned: ${profile.email} (${profile.account_type})`);
        }
      } catch (err) {
        summary.errors.push(`ban ${profile.user_id}: ${String(err)}`);
      }
    }

    // ── 3. Notifications pré-expiration (J-1) ────────────────────────────
    const { data: notifyData, error: notifyErr } = await admin
      .rpc("notify_upcoming_expirations", { p_hours_before: 24 });

    if (notifyErr) {
      summary.errors.push(`notify_upcoming_expirations: ${notifyErr.message}`);
      console.error("[expire-demo-accounts] notify error:", notifyErr.message);
    } else {
      const res = notifyData as RpcResult;
      summary.notifiedCount = res.notified_count ?? 0;
      console.log(`[expire-demo-accounts] Notified: ${summary.notifiedCount}`);
    }

    // ── 4. Audit log ──────────────────────────────────────────────────────
    await admin.from("demo_audit_logs").insert({
      user_id:    null,
      session_id: null,
      action:     "cron_demo_expiration",
      resource:   "system",
      status:     summary.errors.length === 0 ? "allowed" : "error",
      metadata: {
        run_id:          runId,
        started_at:      startedAt,
        completed_at:    new Date().toISOString(),
        expired_count:   summary.expiredCount,
        auth_banned:     summary.authBannedCount,
        notified_count:  summary.notifiedCount,
        errors:          summary.errors,
      },
    });

    const completedAt = new Date().toISOString();
    console.log(`[expire-demo-accounts] Done:`, JSON.stringify({ ...summary, completedAt }));

    return Response.json({ ok: true, ...summary, completedAt });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[expire-demo-accounts] FATAL:", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
});
