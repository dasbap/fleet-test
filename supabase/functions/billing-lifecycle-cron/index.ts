/**
 * Edge Function : billing-lifecycle-cron
 *
 * Exécutée quotidiennement via pg_cron (voir migration 20260516000004).
 * Peut aussi être appelée manuellement via POST sécurisé.
 *
 * Tâches :
 *  1. billing_run_daily_lifecycle() → active→grace→suspended→expired
 *  2. Log des transitions dans billing_events
 *  3. Prépare les relances WhatsApp (insert dans whatsapp_retry_queue)
 *  4. Prépare les relances email (insert dans notification_queue)
 *
 * Sécurité : CRON_SECRET header obligatoire (secret Supabase).
 * Variables ENV :
 *   - CRON_SECRET            : jeton d'authentification cron
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CRON_SECRET      = Deno.env.get("CRON_SECRET") ?? "";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ─── Types ─────────────────────────────────────────────────────────────────

interface LifecycleResult {
  transitioned_to_grace:     number;
  transitioned_to_suspended: number;
  transitioned_to_expired:   number;
  timestamp:                 string;
}

interface FleetRelance {
  fleet_id:        string;
  org_id:          string;
  status:          string;
  billing_status:  string;
  grace_until:     string | null;
  phone_contact:   string | null;
  email_contact:   string | null;
  plan_name:       string | null;
}

// ─── Handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // Méthode
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Auth cron secret
  const authHeader = req.headers.get("Authorization") ?? "";
  const token      = authHeader.replace("Bearer ", "").trim();
  if (!CRON_SECRET || token !== CRON_SECRET) {
    console.error("[billing-lifecycle-cron] Unauthorized — bad CRON_SECRET");
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const runId    = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  console.log(`[billing-lifecycle-cron] Run ${runId} started at ${startedAt}`);

  try {
    // ── 1. Transitions automatiques ──────────────────────────────────────
    const { data: lifecycleRaw, error: lcErr } = await admin.rpc("billing_run_daily_lifecycle");
    if (lcErr) throw new Error(`billing_run_daily_lifecycle: ${lcErr.message}`);

    const lifecycle = lifecycleRaw as LifecycleResult;
    console.log("[billing-lifecycle-cron] Transitions:", JSON.stringify(lifecycle));

    // ── 2. Flottes à relancer (grace ou suspended) ────────────────────────
    const { data: flottesBrut, error: fErr } = await admin
      .from("flottes")
      .select(`
        id,
        org_id,
        abonnements!inner (
          status,
          ends_at,
          grace_until
        ),
        organisations!inner (
          email,
          phone
        ),
        plans!inner (
          name
        )
      `)
      .in("abonnements.status", ["grace_period", "suspended"]);

    if (fErr) {
      console.error("[billing-lifecycle-cron] Lecture flottes:", fErr.message);
    }

    const flottes: FleetRelance[] = ((flottesBrut as Array<Record<string, unknown>>) ?? []).map((row) => {
      const abo  = (row.abonnements as Record<string, unknown>[])?.[0] ?? {};
      const org  = row.organisations as Record<string, unknown> ?? {};
      const plan = (row.plans as Record<string, unknown>[]) ?? [];
      return {
        fleet_id:       row.id as string,
        org_id:         row.org_id as string,
        status:         "active",
        billing_status: abo.status as string,
        grace_until:    abo.grace_until as string | null,
        phone_contact:  org.phone as string | null,
        email_contact:  org.email as string | null,
        plan_name:      (plan[0]?.name as string | null) ?? null,
      };
    });

    console.log(`[billing-lifecycle-cron] Flottes à relancer : ${flottes.length}`);

    // ── 3. Enqueue relances WhatsApp ──────────────────────────────────────
    if (flottes.length > 0) {
      const whatsappQueue = flottes
        .filter((f) => !!f.phone_contact)
        .map((f) => ({
          fleet_id:   f.fleet_id,
          phone:      f.phone_contact,
          template:   f.billing_status === "grace_period"
            ? "billing_grace_reminder"
            : "billing_suspended_alert",
          payload: JSON.stringify({
            fleet_id:    f.fleet_id,
            status:      f.billing_status,
            grace_until: f.grace_until,
            plan_name:   f.plan_name,
          }),
          status:      "pending",
          retry_count: 0,
          scheduled_at: new Date().toISOString(),
          created_at:  new Date().toISOString(),
        }));

      if (whatsappQueue.length > 0) {
        const { error: wErr } = await admin
          .from("whatsapp_retry_queue")
          .insert(whatsappQueue)
          .select("id");

        if (wErr) {
          console.error("[billing-lifecycle-cron] whatsapp_retry_queue:", wErr.message);
        } else {
          console.log(`[billing-lifecycle-cron] ${whatsappQueue.length} relances WhatsApp enqueued`);
        }
      }

      // ── 4. Enqueue relances email ───────────────────────────────────────
      const emailQueue = flottes
        .filter((f) => !!f.email_contact)
        .map((f) => ({
          fleet_id:    f.fleet_id,
          to_email:    f.email_contact,
          template_id: f.billing_status === "grace_period"
            ? "billing_grace"
            : "billing_suspended",
          metadata: {
            fleet_id:    f.fleet_id,
            status:      f.billing_status,
            grace_until: f.grace_until,
            plan_name:   f.plan_name,
          },
          status:      "pending",
          created_at:  new Date().toISOString(),
        }));

      if (emailQueue.length > 0) {
        // Utilise la table notification_queue si elle existe, sinon log seulement
        const { error: eErr } = await admin
          .from("notification_queue")
          .insert(emailQueue);

        if (eErr) {
          // Table peut ne pas exister encore — log sans crash
          console.warn("[billing-lifecycle-cron] notification_queue:", eErr.message);
        } else {
          console.log(`[billing-lifecycle-cron] ${emailQueue.length} relances email enqueued`);
        }
      }
    }

    // ── 5. Billing event run summary ──────────────────────────────────────
    const { error: evErr } = await admin.from("billing_events").insert({
      fleet_id:        "00000000-0000-0000-0000-000000000000", // sentinel global
      subscription_id: null,
      payment_id:      null,
      event_type:      "lifecycle.daily_run",
      payload: {
        run_id:                    runId,
        started_at:                startedAt,
        completed_at:              new Date().toISOString(),
        transitioned_to_grace:     lifecycle?.transitioned_to_grace     ?? 0,
        transitioned_to_suspended: lifecycle?.transitioned_to_suspended ?? 0,
        transitioned_to_expired:   lifecycle?.transitioned_to_expired   ?? 0,
        relances_whatsapp:         flottes.filter((f) => f.phone_contact).length,
        relances_email:            flottes.filter((f) => f.email_contact).length,
      },
    });

    if (evErr) {
      // Non-fatal : le run sentinel fleet_id peut être rejeté par FK
      console.warn("[billing-lifecycle-cron] billing_events summary:", evErr.message);
    }

    const summary = {
      runId,
      startedAt,
      completedAt:             new Date().toISOString(),
      transitionedToGrace:     lifecycle?.transitioned_to_grace     ?? 0,
      transitionedToSuspended: lifecycle?.transitioned_to_suspended ?? 0,
      transitionedToExpired:   lifecycle?.transitioned_to_expired   ?? 0,
      flottesPendingRelance:   flottes.length,
    };

    console.log("[billing-lifecycle-cron] Done:", JSON.stringify(summary));
    return Response.json({ ok: true, ...summary });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[billing-lifecycle-cron] FATAL:", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
});
