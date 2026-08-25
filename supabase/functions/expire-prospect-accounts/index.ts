/**
 * Edge Function : expire-prospect-accounts
 *
 * Cron quotidien (03:00 UTC) — gestion du cycle de vie des prospects.
 *
 * Étapes :
 *   1. prospect_expire_accounts()   → status active → expired si trial_end < now()
 *   2. prospect_suspend_expired()   → status expired → suspended après 24h de grâce
 *   3. Suspension auth.users        → ban Supabase Auth pour les comptes suspendus
 *   4. Reset hebdomadaire flottes   → nettoyer les données démo (dimanche uniquement)
 *   5. Audit log résumé
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

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i]! ^ bb[i]!;
  return diff === 0;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RpcResult {
  ok:               boolean;
  expired_count?:   number;
  suspended_count?: number;
  error?:           string;
}

interface SuspendedProspect {
  user_id:  string;
  email:    string;
  fleet_id: string;
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
  if (!CRON_SECRET || !timingSafeEqual(token, CRON_SECRET)) {
    console.error("[expire-prospect-accounts] Unauthorized");
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const runId      = crypto.randomUUID();
  const startedAt  = new Date().toISOString();
  const isWeekly   = new Date().getDay() === 0; // Dimanche = reset flottes

  console.log(`[expire-prospect-accounts] Run ${runId} — isWeekly: ${isWeekly}`);

  const summary = {
    runId,
    startedAt,
    expiredCount:   0,
    suspendedCount: 0,
    authBannedCount: 0,
    fleetsResetCount: 0,
    errors:          [] as string[],
  };

  try {
    // ── 1. Expirer les comptes dont trial_end < now() ─────────────────────
    const { data: expireData, error: expireErr } = await admin.rpc("prospect_expire_accounts");

    if (expireErr) {
      summary.errors.push(`prospect_expire_accounts: ${expireErr.message}`);
      console.error("[expire-prospect-accounts] expire error:", expireErr.message);
    } else {
      const res = expireData as RpcResult;
      summary.expiredCount = res.expired_count ?? 0;
      console.log(`[expire-prospect-accounts] Expired: ${summary.expiredCount}`);
    }

    // ── 2. Suspendre les comptes expirés depuis > 24h ─────────────────────
    const { data: suspendData, error: suspendErr } = await admin.rpc("prospect_suspend_expired");

    if (suspendErr) {
      summary.errors.push(`prospect_suspend_expired: ${suspendErr.message}`);
      console.error("[expire-prospect-accounts] suspend error:", suspendErr.message);
    } else {
      const res = suspendData as RpcResult;
      summary.suspendedCount = res.suspended_count ?? 0;
      console.log(`[expire-prospect-accounts] Suspended: ${summary.suspendedCount}`);
    }

    // ── 3. Ban Supabase Auth pour les comptes suspendus ───────────────────
    // Récupérer les users nouvellement suspendus (updated_at < 5 minutes ago)
    const { data: toban } = await admin
      .from("prospect_registrations")
      .select("user_id, email, fleet_id")
      .eq("status", "suspended")
      .gte("updated_at", new Date(Date.now() - 10 * 60_000).toISOString()); // 10 min window

    const prospects = (toban ?? []) as SuspendedProspect[];

    for (const prospect of prospects) {
      try {
        // Bannir le compte auth (ban_duration = "none" = ban permanent)
        const { error: banErr } = await admin.auth.admin.updateUserById(
          prospect.user_id,
          { ban_duration: "876600h" }, // ~100 ans = ban permanent
        );

        if (banErr) {
          summary.errors.push(`ban ${prospect.user_id}: ${banErr.message}`);
        } else {
          summary.authBannedCount++;
          console.log(`[expire-prospect-accounts] Banned: ${prospect.email}`);
        }
      } catch (err) {
        summary.errors.push(`ban ${prospect.user_id}: ${String(err)}`);
      }
    }

    // ── 4. Reset hebdomadaire des flottes démo (dimanche uniquement) ──────
    if (isWeekly) {
      console.log("[expire-prospect-accounts] Weekly global demo fleet reset disabled");
      /*
      const { data: demoFleets } = await admin
        .from("flottes")
        .select("id, name")
        .eq("is_demo", true);

      for (const fleet of (demoFleets ?? []) as { id: string; name: string }[]) {
        const { data: resetData, error: resetErr } = await admin.rpc(
          "prospect_reset_demo_fleet",
          { p_fleet_id: fleet.id },
        );

        if (resetErr) {
          summary.errors.push(`reset fleet ${fleet.id}: ${resetErr.message}`);
          console.error(`[expire-prospect-accounts] reset fleet ${fleet.name}:`, resetErr.message);
        } else {
          const res = resetData as { ok: boolean; vehicles_deleted?: number };
          if (res.ok) {
            summary.fleetsResetCount++;
            console.log(
              `[expire-prospect-accounts] Fleet reset: ${fleet.name}`,
              `(${res.vehicles_deleted ?? 0} véhicules supprimés)`,
            );
          }
        }
      }
      */
    }

    // ── 5. Audit log résumé ───────────────────────────────────────────────
    await admin.from("demo_audit_logs").insert({
      user_id:    null,
      session_id: null,
      action:     "cron_prospect_lifecycle",
      resource:   "system",
      status:     summary.errors.length === 0 ? "allowed" : "error",
      metadata: {
        run_id:           runId,
        started_at:       startedAt,
        completed_at:     new Date().toISOString(),
        expired_count:    summary.expiredCount,
        suspended_count:  summary.suspendedCount,
        auth_banned:      summary.authBannedCount,
        fleets_reset:     summary.fleetsResetCount,
        errors:           summary.errors,
      },
    });

    const completedAt = new Date().toISOString();
    console.log(`[expire-prospect-accounts] Done:`, JSON.stringify({ ...summary, completedAt }));

    return Response.json({
      ok: true,
      ...summary,
      completedAt,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[expire-prospect-accounts] FATAL:", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
});
