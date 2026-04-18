// Edge Function : relance rétention pour utilisateurs avec onboarding incomplet et inactifs.
// Appel réservé au cron (secret partagé CRON_SECRET), pas d'auth utilisateur.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

type OnboardingRow = {
  user_id: string;
  org_id: string;
};

type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

function getBearerToken(req: Request): string | null {
  const raw = req.headers.get("Authorization") ?? "";
  if (!raw.startsWith("Bearer ")) return null;
  const t = raw.slice("Bearer ".length).trim();
  return t.length > 0 ? t : null;
}

/** Comparaison à temps constant pour éviter les fuites par timing sur le secret. */
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

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Configuration Supabase manquante.");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

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

const NUDGE_KIND = "onboarding_incomplete";

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

  const idleDays = parsePositiveInt(Deno.env.get("RETENTION_IDLE_DAYS"), 3);
  const cooldownDays = parsePositiveInt(Deno.env.get("RETENTION_COOLDOWN_DAYS"), 7);
  const maxPerRun = parsePositiveInt(Deno.env.get("RETENTION_MAX_PER_RUN"), 100);

  const idleMs = idleDays * 86_400_000;
  const cooldownMs = cooldownDays * 86_400_000;
  const idleCutoff = new Date(Date.now() - idleMs).toISOString();
  const cooldownCutoff = new Date(Date.now() - cooldownMs).toISOString();

  try {
    const supabase = createServiceClient();

    const { data: staleRows, error: qErr } = await supabase
      .from("onboarding_progress")
      .select("user_id, org_id")
      .eq("completed", false)
      .lt("updated_at", idleCutoff)
      .limit(500);

    if (qErr) {
      console.error("Requête onboarding_progress:", qErr);
      return new Response(JSON.stringify({ error: "Erreur lors de la lecture des candidats." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const candidates = (staleRows ?? []) as OnboardingRow[];
    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({
          sent: 0,
          skipped: 0,
          message: "Aucun candidat éligible.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const userIds = [...new Set(candidates.map((c) => c.user_id))];

    const { data: recentLogs, error: logErr } = await supabase
      .from("retention_nudge_log")
      .select("user_id, org_id")
      .gte("sent_at", cooldownCutoff)
      .in("user_id", userIds);

    if (logErr) {
      console.error("Requête retention_nudge_log:", logErr);
      return new Response(JSON.stringify({ error: "Erreur lors de la lecture du journal." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const recent = new Set(
      (recentLogs ?? []).map((r: { user_id: string; org_id: string }) => `${r.user_id}|${r.org_id}`),
    );

    const toProcess = candidates
      .filter((c) => !recent.has(`${c.user_id}|${c.org_id}`))
      .slice(0, maxPerRun);

    let sent = 0;
    let skipped = 0;
    const failures: { user_id: string; org_id: string; reason: string }[] = [];

    const title = "Reprenez votre configuration";
    const body =
      "Vous n'avez pas terminé l'onboarding. Ouvrez l'application pour continuer.";

    for (const row of toProcess) {
      const { data: tokenRows, error: tErr } = await supabase
        .from("notification_tokens")
        .select("token")
        .eq("user_id", row.user_id);

      if (tErr) {
        console.error("Tokens:", tErr);
        failures.push({ user_id: row.user_id, org_id: row.org_id, reason: "tokens_db" });
        continue;
      }

      const tokens =
        tokenRows
          ?.map((x: { token: string }) => x.token)
          .filter((t: string) => typeof t === "string" && t.length > 0) ?? [];

      if (tokens.length === 0) {
        skipped += 1;
        continue;
      }

      const payload: NotificationPayload = {
        title,
        body,
        data: {
          type: NUDGE_KIND,
          org_id: row.org_id,
        },
      };

      const fcm = await sendFcmLegacy(tokens, payload);
      if (!fcm.ok) {
        failures.push({ user_id: row.user_id, org_id: row.org_id, reason: "fcm" });
        continue;
      }

      const { error: insErr } = await supabase.from("retention_nudge_log").insert({
        user_id: row.user_id,
        org_id: row.org_id,
        kind: NUDGE_KIND,
      });

      if (insErr) {
        console.error("Insert journal:", insErr);
        failures.push({ user_id: row.user_id, org_id: row.org_id, reason: "log_insert" });
        continue;
      }

      sent += 1;
    }

    return new Response(
      JSON.stringify({
        sent,
        skipped,
        candidates: toProcess.length,
        failures: failures.length > 0 ? failures : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("retention-nudge:", e);
    return new Response(JSON.stringify({ error: "Erreur interne." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
