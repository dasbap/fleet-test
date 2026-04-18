// Séquence automatique d'onboarding pour chauffeurs inactifs (aucun créneau).
// Déclenchée par cron avec CRON_SECRET. Canaux : FCM (notification_tokens) + Orange SMS CM (+237).
//
// Déploiement :
//   supabase functions deploy onboarding-sequence
//   supabase secrets set ORANGE_SMS_TOKEN=<bearer_token>
//   supabase secrets set ORANGE_SENDER_ID=E-Samba   # optionnel
//   supabase secrets set CRON_SECRET=<secret>
//   supabase secrets set FCM_SERVER_KEY=<legacy_key>
//
// pg_cron (exemple) :
//   SELECT cron.schedule('onboarding-sequence', '0 7 * * *',
//     $$SELECT net.http_post(
//       'https://<project>.supabase.co/functions/v1/onboarding-sequence',
//       '{}',
//       '{"Content-Type":"application/json","Authorization":"Bearer <CRON_SECRET>"}'::jsonb
//     )$$);

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

function getBearerToken(req: Request): string | null {
  const raw = req.headers.get("Authorization") ?? "";
  if (!raw.startsWith("Bearer ")) return null;
  const t = raw.slice("Bearer ".length).trim();
  return t.length > 0 ? t : null;
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i]! ^ bb[i]!;
  return diff === 0;
}

function verifyCronSecret(req: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return false;
  const token = getBearerToken(req);
  if (!token) return false;
  return timingSafeEqualStrings(token, secret);
}

function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Configuration Supabase manquante.");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

async function sendFcmLegacy(
  tokens: string[],
  payload: NotificationPayload,
): Promise<{ ok: boolean; status?: number }> {
  if (tokens.length === 0) return { ok: false };

  const serverKey = Deno.env.get("FCM_SERVER_KEY");
  if (!serverKey) {
    console.error("FCM_SERVER_KEY manquant.");
    return { ok: false };
  }

  const body = {
    registration_ids: tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data ?? {},
  };

  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${serverKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Erreur FCM:", res.status, text);
    return { ok: false, status: res.status };
  }

  return { ok: true };
}

const ORANGE_SMS_TOKEN = Deno.env.get("ORANGE_SMS_TOKEN");
const ORANGE_SENDER = Deno.env.get("ORANGE_SENDER_ID") ?? "E-Samba";

async function sendOrangeSMS(to: string, body: string): Promise<boolean> {
  if (!ORANGE_SMS_TOKEN) {
    console.warn("[sms] ORANGE_SMS_TOKEN manquant — SMS non envoyé");
    return false;
  }

  const normalized = to.replace(/\D/g, "");
  const e164 = normalized.startsWith("237") ? `+${normalized}` : `+237${normalized}`;

  try {
    const res = await fetch(
      "https://api.orange.com/smsmessaging/v1/outbound/tel%3A%2B237/requests",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ORANGE_SMS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outboundSMSMessageRequest: {
            address: [`tel:${e164}`],
            senderAddress: "tel:+237",
            senderName: ORANGE_SENDER,
            outboundSMSTextMessage: { message: body },
          },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[sms] Erreur Orange SMS pour ${e164}:`, err);
      return false;
    }

    console.log(`[sms] SMS envoyé à ${e164}`);
    return true;
  } catch (e) {
    console.error(`[sms] Exception pour ${e164}:`, e);
    return false;
  }
}

interface InactiveDriver {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  push_tokens: string[] | null;
  fleet_id: string;
  fleet_name: string;
  org_name: string;
  manager_name: string | null;
  manager_phone: string | null;
  days_since_join: number;
}

type SequenceChannel = "push" | "sms" | "alert_manager";

interface SequenceStep {
  day: number;
  channel: SequenceChannel;
  title?: string;
  body: (d: InactiveDriver) => string;
}

const SEQUENCE: SequenceStep[] = [
  {
    day: 1,
    channel: "push",
    title: "Bienvenue sur E-Samba !",
    body: (d) =>
      `Bonjour ${d.full_name?.split(" ")[0] ?? ""} ! Votre compte est prêt. ` +
      `Ouvrez votre 1er créneau aujourd'hui et commencez à suivre votre activité.`,
  },
  {
    day: 3,
    channel: "sms",
    body: (d) =>
      `Bonjour ${d.full_name?.split(" ")[0] ?? ""} ! ` +
      `Votre compte chauffeur E-Samba est prêt mais vous n'avez pas encore ouvert de créneau.\n\n` +
      `C'est simple : ouvrez l'app → "Démarrer un créneau" → roulez.\n\n` +
      (d.manager_name && d.manager_phone
        ? `Un souci ? Appelez ${d.manager_name} au ${d.manager_phone}.\n\n`
        : "") +
      `E-Samba · ${d.fleet_name}`,
  },
  {
    day: 7,
    channel: "alert_manager",
    body: (d) =>
      `Le chauffeur ${d.full_name} (${d.fleet_name}) n'a pas ouvert de créneau ` +
      `depuis 7 jours. Une action de votre part est recommandée.`,
  },
  {
    day: 14,
    channel: "sms",
    body: (d) =>
      `Bonjour ${d.full_name?.split(" ")[0] ?? ""}, votre accès E-Samba est toujours actif.\n\n` +
      `Sans activité, votre compte sera suspendu prochainement.\n\n` +
      `Ouvrez l'app maintenant et démarrez votre 1er créneau — ça prend 2 minutes.\n\n` +
      `Besoin d'aide ? Répondez à ce message.\n\nE-Samba`,
  },
];

async function logSequenceObservation(
  supabase: ReturnType<typeof createServiceClient>,
  row: {
    fleet_id: string;
    event_type: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("system_events").insert({
    event_type: row.event_type,
    severity: "info",
    fleet_id: row.fleet_id,
    actor_user_id: null,
    payload: row.payload,
  });
  if (error) {
    console.error("[onboarding-sequence] system_events:", error);
  }
}

async function insertSequenceLog(
  supabase: ReturnType<typeof createServiceClient>,
  row: {
    user_id: string;
    fleet_id: string;
    step_day: number;
    channel: string;
    metadata: Record<string, unknown>;
  },
): Promise<boolean> {
  const { error } = await supabase.from("onboarding_sequence_log").insert({
    user_id: row.user_id,
    fleet_id: row.fleet_id,
    step_day: row.step_day,
    channel: row.channel,
    metadata: row.metadata,
  });
  if (error) {
    console.error("[onboarding-sequence] insert log:", error);
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 });
  }

  if (!verifyCronSecret(req)) {
    return new Response(JSON.stringify({ error: "Non autorisé." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("[onboarding-sequence] Début —", new Date().toISOString());

  try {
    const supabase = createServiceClient();

    const { data: drivers, error } = await supabase.rpc("get_inactive_drivers_with_manager");

    if (error) {
      console.error("[onboarding-sequence] RPC error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results = {
      evaluated: 0,
      push_sent: 0,
      sms_sent: 0,
      alerts: 0,
      skipped: 0,
      sms_skipped_no_phone: 0,
      sms_skipped_api_error: 0,
    };

    for (const raw of drivers as InactiveDriver[]) {
      results.evaluated++;

      const step = SEQUENCE.find((s) => s.day === raw.days_since_join);
      if (!step) {
        results.skipped++;
        continue;
      }

      const message = step.body(raw);
      const tokens = (raw.push_tokens ?? []).filter((t) => typeof t === "string" && t.length > 0);

      if (step.channel === "push") {
        if (tokens.length === 0) {
          results.skipped++;
          continue;
        }
        const fcm = await sendFcmLegacy(tokens, {
          title: step.title ?? "E-Samba",
          body: message,
          data: {
            type: "onboarding_sequence",
            step_day: String(step.day),
            fleet_id: raw.fleet_id,
            screen: "Fleet",
          },
        });
        if (!fcm.ok) {
          results.skipped++;
          continue;
        }
        const okLog = await insertSequenceLog(supabase, {
          user_id: raw.user_id,
          fleet_id: raw.fleet_id,
          step_day: step.day,
          channel: "push",
          metadata: { driver: raw.full_name, org_name: raw.org_name },
        });
        if (!okLog) {
          results.skipped++;
          continue;
        }
        results.push_sent++;
        continue;
      }

      if (step.channel === "sms") {
        if (!raw.phone || raw.phone.trim().length === 0) {
          results.skipped++;
          results.sms_skipped_no_phone++;
          await logSequenceObservation(supabase, {
            fleet_id: raw.fleet_id,
            event_type: "onboarding_sequence_sms_skipped",
            payload: {
              reason: "no_phone",
              user_id: raw.user_id,
              step_day: step.day,
              channel: "sms",
            },
          });
          continue;
        }
        const ok = await sendOrangeSMS(raw.phone, message);
        if (!ok) {
          results.skipped++;
          results.sms_skipped_api_error++;
          await logSequenceObservation(supabase, {
            fleet_id: raw.fleet_id,
            event_type: "onboarding_sequence_sms_failed",
            payload: {
              reason: "orange_api_error",
              user_id: raw.user_id,
              step_day: step.day,
              channel: "sms",
            },
          });
          continue;
        }
        const okSmsLog = await insertSequenceLog(supabase, {
          user_id: raw.user_id,
          fleet_id: raw.fleet_id,
          step_day: step.day,
          channel: "sms",
          metadata: { driver: raw.full_name, org_name: raw.org_name },
        });
        if (!okSmsLog) {
          results.skipped++;
          continue;
        }
        results.sms_sent++;
        continue;
      }

      if (step.channel === "alert_manager") {
        const { error: evErr } = await supabase.from("system_events").insert({
          event_type: "driver_onboarding_alert",
          severity: "medium",
          fleet_id: raw.fleet_id,
          actor_user_id: raw.user_id,
          payload: {
            driver_user_id: raw.user_id,
            driver_name: raw.full_name,
            fleet_name: raw.fleet_name,
            org_name: raw.org_name,
            message,
            days_since_join: raw.days_since_join,
            action_required: true,
          },
        });
        if (evErr) {
          console.error("[onboarding-sequence] system_events:", evErr);
          results.skipped++;
          continue;
        }
        const okAlertLog = await insertSequenceLog(supabase, {
          user_id: raw.user_id,
          fleet_id: raw.fleet_id,
          step_day: step.day,
          channel: "alert_manager",
          metadata: { driver: raw.full_name, org_name: raw.org_name },
        });
        if (!okAlertLog) {
          results.skipped++;
          continue;
        }
        results.alerts++;
      }
    }

    console.log("[onboarding-sequence] Terminé —", results);

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("onboarding-sequence:", e);
    return new Response(JSON.stringify({ error: "Erreur interne." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
