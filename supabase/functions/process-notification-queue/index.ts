import { createClient } from "jsr:@supabase/supabase-js@2";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "billing@e-samba.com";
const MAX_RETRIES = 3;
const BATCH_SIZE = 25;
const SEND_INTERVAL_MS = 110;

interface QueueRow {
  id: string;
  fleet_id: string | null;
  to_email: string;
  template_id: string;
  metadata: Record<string, unknown>;
  retry_count: number;
}

interface ResendPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

interface ReservationResult {
  ok?: boolean;
  reason?: string;
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i]! ^ bb[i]!;
  return diff === 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendEmail(payload: ResendPayload): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY_missing" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return { ok: false, error: `Resend ${response.status}: ${text.slice(0, 200)}` };
  }

  return { ok: true };
}

function buildEmail(row: QueueRow): ResendPayload | null {
  const m = row.metadata;

  if (row.template_id === "demo_request_accepted") {
    const userName = escapeHtml(String(m.user_name ?? m.full_name ?? ""));
    const companyName = escapeHtml(String(m.company_name ?? m.company ?? "votre entreprise"));
    const invitationUrl = escapeHtml(String(m.invitation_url ?? "https://www.e-samba.com/auth"));

    return {
      from: `E-Samba <${FROM_EMAIL}>`,
      to: [row.to_email],
      subject: "Votre demande E-Samba a été acceptée",
      html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:20px"><div style="max-width:580px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden"><div style="background:#16a34a;padding:24px 32px"><h1 style="color:#fff;margin:0;font-size:20px">Votre demande E-Samba est acceptée</h1></div><div style="padding:32px"><p style="margin:0 0 16px">Bonjour${userName ? ` <strong>${userName}</strong>` : ""},</p><p style="margin:0 0 16px">Votre demande pour <strong>${companyName}</strong> a été acceptée. Votre compte E-Samba est prêt.</p><p style="margin:0 0 24px">Utilisez le bouton ci-dessous pour définir votre mot de passe et accéder à votre compte.</p><a href="${invitationUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">Créer mon mot de passe</a><hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0"><p style="font-size:13px;color:#6b7280;margin:0">Besoin d'aide ? <a href="mailto:support@e-samba.com">support@e-samba.com</a></p></div></div></body></html>`,
    };
  }

  if (row.template_id === "demo_request_refused") {
    const userName = escapeHtml(String(m.user_name ?? m.full_name ?? ""));
    const companyName = escapeHtml(String(m.company_name ?? m.company ?? "votre entreprise"));
    const reason = escapeHtml(String(m.reason ?? "Votre demande ne peut pas être acceptée pour le moment."));

    return {
      from: `E-Samba <${FROM_EMAIL}>`,
      to: [row.to_email],
      subject: "Décision concernant votre demande E-Samba",
      html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Arial,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:20px"><div style="max-width:580px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden"><div style="background:#334155;padding:24px 32px"><h1 style="color:#fff;margin:0;font-size:20px">Décision concernant votre demande</h1></div><div style="padding:32px"><p style="margin:0 0 16px">Bonjour${userName ? ` <strong>${userName}</strong>` : ""},</p><p style="margin:0 0 16px">Votre demande pour <strong>${companyName}</strong> n'a pas été acceptée.</p><p style="margin:0 0 24px"><strong>Motif :</strong> ${reason}</p><p style="font-size:13px;color:#6b7280;margin:0">Vous pouvez contacter l'équipe E-Samba à <a href="mailto:support@e-samba.com">support@e-samba.com</a>.</p></div></div></body></html>`,
    };
  }

  if (row.template_id === "prospect_welcome") {
    const companyName = escapeHtml(String(m.company_name ?? "votre entreprise"));
    const trialDays = escapeHtml(String(m.trial_days ?? 7));
    const loginUrl = escapeHtml(String(m.login_url ?? "https://www.e-samba.com/auth"));
    return {
      from: `E-Samba <${FROM_EMAIL}>`,
      to: [row.to_email],
      subject: "Votre accès démo E-Samba est prêt",
      html: `<!DOCTYPE html><html lang="fr"><body style="font-family:Arial,sans-serif"><p>Bonjour,</p><p>Un accès démo a été créé pour <strong>${companyName}</strong>. Il est valable ${trialDays} jour(s).</p><p><a href="${loginUrl}">Ouvrir E-Samba</a></p></body></html>`,
    };
  }

  if (row.template_id === "billing_grace" || row.template_id === "billing_suspended") {
    const planName = escapeHtml(String(m.plan_name ?? "votre plan"));
    const suspended = row.template_id === "billing_suspended";
    return {
      from: `E-Samba Billing <${FROM_EMAIL}>`,
      to: [row.to_email],
      subject: suspended ? "Votre accès E-Samba a été suspendu" : "Votre abonnement E-Samba arrive à expiration",
      html: `<!DOCTYPE html><html lang="fr"><body style="font-family:Arial,sans-serif"><p>Bonjour,</p><p>Votre abonnement <strong>${planName}</strong> ${suspended ? "a expiré et votre accès est suspendu" : "arrive à expiration"}.</p><p><a href="https://e-samba.com/dashboard/billing">Gérer mon abonnement</a></p></body></html>`,
    };
  }

  return null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return Response.json({ ok: false, error: "server_configuration_error" }, { status: 503 });

  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const requestId = typeof body.request_id === "string" ? body.request_id.trim() : "";
  const cronToken = typeof body.secret === "string" ? body.secret.trim() : "";
  const cronAuthorized = Boolean(CRON_SECRET && cronToken && timingSafeEqual(cronToken, CRON_SECRET));

  if (!cronAuthorized) {
    const authorization = req.headers.get("Authorization") ?? "";
    const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!bearer || !requestId) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { data: userData, error: userError } = await admin.auth.getUser(bearer);
    if (userError || !userData.user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { data: profile, error: profileError } = await admin
      .from("admin_profiles")
      .select("user_id,is_active")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.is_active === false) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
  }

  let query = admin
    .from("notification_queue")
    .select("id, fleet_id, to_email, template_id, metadata, retry_count")
    .eq("status", "pending")
    .lt("retry_count", MAX_RETRIES)
    .order("created_at", { ascending: true });

  if (requestId) {
    query = query
      .contains("metadata", { request_id: requestId })
      .in("template_id", ["demo_request_accepted", "demo_request_refused"])
      .limit(5);
  } else {
    query = query.limit(BATCH_SIZE);
  }

  const { data: rows, error: fetchError } = await query;
  if (fetchError) return Response.json({ ok: false, error: fetchError.message }, { status: 500 });

  const queue = (rows ?? []) as QueueRow[];
  const stats = { sent: 0, failed: 0, abandoned: 0, skipped: 0, deferred: 0 };
  let lastSendAt = 0;

  for (const row of queue) {
    const payload = buildEmail(row);
    if (!payload) {
      await admin.from("notification_queue").update({
        status: "abandoned",
        error_msg: `Unknown template: ${row.template_id}`,
        retry_count: row.retry_count + 1,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      stats.skipped++;
      continue;
    }

    const { data: reservationData, error: reservationError } = await admin.rpc(
      "reserve_notification_email_send",
      { p_queue_id: row.id },
    );

    if (reservationError) {
      stats.failed++;
      continue;
    }

    const reservation = reservationData as ReservationResult | null;
    if (reservation?.ok !== true) {
      stats.deferred++;
      if (reservation?.reason === "daily_limit_reached" || reservation?.reason === "monthly_limit_reached") break;
      continue;
    }

    const elapsed = Date.now() - lastSendAt;
    if (lastSendAt > 0 && elapsed < SEND_INTERVAL_MS) await sleep(SEND_INTERVAL_MS - elapsed);

    const result = await sendEmail(payload);
    lastSendAt = Date.now();

    if (result.ok) {
      await admin.from("notification_queue").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        error_msg: null,
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      stats.sent++;
      continue;
    }

    const retryCount = row.retry_count + 1;
    const status = retryCount >= MAX_RETRIES ? "abandoned" : "pending";
    await admin.from("notification_queue").update({
      status,
      retry_count: retryCount,
      error_msg: result.error ?? "email_send_failed",
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    if (status === "abandoned") stats.abandoned++;
    else stats.failed++;
  }

  return Response.json({
    ok: stats.failed === 0 && stats.abandoned === 0,
    processed: queue.length,
    ...stats,
  });
});