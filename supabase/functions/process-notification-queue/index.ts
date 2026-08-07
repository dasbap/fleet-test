/**
 * Edge Function : process-notification-queue
 *
 * Consomme notification_queue — envoie les emails de relance billing.
 * Appelée par pg_cron toutes les 15 minutes.
 *
 * Provider email : Resend (https://resend.com)
 * Secrets requis :
 *   - RESEND_API_KEY         : clé API Resend
 *   - RESEND_FROM_EMAIL      : expéditeur (ex: billing@e-samba.com)
 *   - CRON_SECRET            : auth cron (idem billing-lifecycle-cron)
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Templates gérés :
 *   prospect_welcome  → accueil prospect/demo avec acces temporaire
 *   billing_grace     → période de grâce, renouveler avant expiration
 *   billing_suspended → accès suspendu, réactiver l'abonnement
 *
 * Logique retry :
 *   retry_count < 3 → re-tentative avec backoff exponentiel
 *   retry_count >= 3 → status = 'abandoned'
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "billing@e-samba.com";

const MAX_RETRIES = 3;
const BATCH_SIZE = 50;

// ─── Types ─────────────────────────────────────────────────────────────────

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

// ─── Auth ─────────────────────────────────────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i]! ^ bb[i]!;
  return diff === 0;
}

// ─── Resend ────────────────────────────────────────────────────────────────

async function sendEmail(
  payload: ResendPayload
): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY manquant" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` };
  }

  return { ok: true };
}

// ─── Templates ─────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmail(row: QueueRow): ResendPayload | null {
  const m = row.metadata;
  const planName = (m.plan_name as string | null) ?? "votre plan";
  const graceUntil = m.grace_until as string | null;
  const graceDate = graceUntil
    ? new Date(graceUntil).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  if (row.template_id === "prospect_welcome") {
    const companyName = escapeHtml(
      (m.company_name as string | null) ?? "votre entreprise"
    );
    const trialDays = escapeHtml(
      String((m.trial_days as number | string | null) ?? 7)
    );
    const trialEnd = m.trial_end as string | null;
    const trialEndDate = trialEnd
      ? new Date(trialEnd).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;
    const loginUrl = escapeHtml(
      (m.login_url as string | null) ?? "https://www.e-samba.com/auth"
    );
    const tempPassword = escapeHtml((m.temp_password as string | null) ?? "");

    return {
      from: `E-Samba <${FROM_EMAIL}>`,
      to: [row.to_email],
      subject: "Votre acces demo E-Samba est pret",
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <div style="background:#16a34a;padding:24px 32px">
    <img src="https://www.e-samba.com/logo.png" alt="E-Samba" style="height:36px" onerror="this.style.display='none'">
    <h1 style="color:#fff;margin:12px 0 0;font-size:20px">Votre demo E-Samba est ouverte</h1>
  </div>
  <div style="padding:32px">
    <p style="margin:0 0 16px">Bonjour,</p>
    <p style="margin:0 0 16px">
      Un acces demo a ete cree pour <strong>${companyName}</strong>. Il est valable ${trialDays} jour(s)${
        trialEndDate ? `, jusqu'au <strong>${trialEndDate}</strong>` : ""
      }.
    </p>
    <p style="margin:0 0 16px">Connectez-vous avec cette adresse email :</p>
    <p style="margin:0 0 8px"><strong>${row.to_email}</strong></p>
    ${
      tempPassword
        ? `<p style="margin:0 0 24px">Mot de passe temporaire : <strong>${tempPassword}</strong></p>`
        : ""
    }
    <a href="${loginUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">
      Ouvrir E-Samba
    </a>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
    <p style="font-size:13px;color:#6b7280;margin:0">
      Besoin d'aide ? Contactez-nous a <a href="mailto:support@e-samba.com" style="color:#16a34a">support@e-samba.com</a><br>
      E-Samba - Gestion de flotte pour l'Afrique
    </p>
  </div>
</div>
</body>
</html>`,
    };
  }

  if (row.template_id === "demo_request_accepted") {
    const userName = escapeHtml(
      (m.user_name as string | null) ?? "votre utilisateur"
    );
    const companyName = escapeHtml(
      (m.company_name as string | null) ?? "votre entreprise"
    );
    const invitationUrl = escapeHtml(
      (m.invitation_url as string | null) ?? "https://www.e-samba.com/auth"
    );

    return {
      from: `E-Samba <${FROM_EMAIL}>`,
      to: [row.to_email],
      subject: "Votre compte E-Samba est actif",
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <div style="background:#16a34a;padding:24px 32px">
    <h1 style="color:#fff;margin:0;font-size:20px">Votre accès E-Samba est actif</h1>
  </div>
  <div style="padding:32px">
    <p style="margin:0 0 16px">Bonjour,</p>
    <p style="margin:0 0 16px">Votre demande pour <strong>${companyName}</strong> a été acceptée.</p>
    <p style="margin:0 0 8px">Votre utilisateur : <strong>${userName}</strong></p>
    <p style="margin:0 0 24px">Utilisez le lien ci-dessous pour créer ou modifier le mot de passe associé à ce compte.</p>
    <a href="${invitationUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">Créer mon mot de passe</a
    <p style="margin:0 0 8px">Votre utilisateur : <strong>${userName}</strong></p>
    <p style="margin:0 0 24px">Utilisez le lien ci-dessous pour creer ou modifier le mot de passe associe a ce compte.</p>
    <a href="${invitationUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">Creer mon mot de passe</a>
  </div>
</div>
</body>
</html>`,
    };
  }

  if (row.template_id === "demo_request_refused") {
    const companyName = escapeHtml(
      (m.company_name as string | null) ?? "votre entreprise"
    );
    const reason = escapeHtml(
      (m.reason as string | null) ??
        "Votre demande ne peut pas etre activee pour le moment."
    );

    return {
      from: `E-Samba <${FROM_EMAIL}>`,
      to: [row.to_email],
      subject: "Votre demande E-Samba",
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <div style="background:#334155;padding:24px 32px">
    <h1 style="color:#fff;margin:0;font-size:20px">Demande E-Samba traitee</h1>
  </div>
  <div style="padding:32px">
    <p style="margin:0 0 16px">Bonjour,</p>
    <p style="margin:0 0 16px">Votre demande pour <strong>${companyName}</strong> n'a pas ete acceptee.</p>
    <p style="margin:0 0 24px">${reason}</p>
    <p style="font-size:13px;color:#6b7280;margin:0">Vous pouvez recontacter l'equipe E-Samba depuis le formulaire du site.</p>
  </div>
</div>
</body>
</html>`,
    };
  }

  if (row.template_id === "billing_grace") {
    return {
      from: `E-Samba Billing <${FROM_EMAIL}>`,
      to: [row.to_email],
      subject: "⚠️ Votre abonnement E-Samba arrive à expiration",
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <div style="background:#f59e0b;padding:24px 32px">
    <img src="https://e-samba.com/logo.png" alt="E-Samba" style="height:36px" onerror="this.style.display='none'">
    <h1 style="color:#fff;margin:12px 0 0;font-size:20px">Abonnement en période de grâce</h1>
  </div>
  <div style="padding:32px">
    <p style="margin:0 0 16px">Bonjour,</p>
    <p style="margin:0 0 16px">
      Votre abonnement <strong>${planName}</strong> est entré en <strong>période de grâce</strong>.
      ${
        graceDate
          ? `Vous avez jusqu'au <strong>${graceDate}</strong> pour régulariser votre situation.`
          : "Veuillez régulariser votre situation dès que possible."
      }
    </p>
    <p style="margin:0 0 24px">Passé ce délai, votre accès à la plateforme E-Samba sera suspendu.</p>
    <a href="https://e-samba.com/dashboard/billing" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">
      Renouveler mon abonnement
    </a>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
    <p style="font-size:13px;color:#6b7280;margin:0">
      Une question ? Contactez-nous à <a href="mailto:support@e-samba.com" style="color:#f59e0b">support@e-samba.com</a><br>
      E-Samba · Gestion de flotte CEMAC
    </p>
  </div>
</div>
</body>
</html>`,
    };
  }

  if (row.template_id === "billing_suspended") {
    return {
      from: `E-Samba Billing <${FROM_EMAIL}>`,
      to: [row.to_email],
      subject: "🔴 Votre accès E-Samba a été suspendu",
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <div style="background:#dc2626;padding:24px 32px">
    <img src="https://e-samba.com/logo.png" alt="E-Samba" style="height:36px" onerror="this.style.display='none'">
    <h1 style="color:#fff;margin:12px 0 0;font-size:20px">Accès suspendu</h1>
  </div>
  <div style="padding:32px">
    <p style="margin:0 0 16px">Bonjour,</p>
    <p style="margin:0 0 16px">
      Votre abonnement <strong>${planName}</strong> a expiré et votre accès à E-Samba est désormais <strong>suspendu</strong>.
    </p>
    <p style="margin:0 0 24px">
      Vos données sont conservées. Réactivez votre abonnement pour retrouver l'accès complet à votre flotte.
    </p>
    <a href="https://e-samba.com/dashboard/billing" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">
      Réactiver mon accès
    </a>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
    <p style="font-size:13px;color:#6b7280;margin:0">
      Besoin d'aide ? <a href="mailto:support@e-samba.com" style="color:#dc2626">support@e-samba.com</a><br>
      E-Samba · Gestion de flotte CEMAC
    </p>
  </div>
</div>
</body>
</html>`,
    };
  }

  // Template inconnu → log + skip
  console.warn(
    `[process-notification-queue] Template inconnu : ${row.template_id}`
  );
  return null;
}

// ─── Handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Auth via body.secret (même pattern que billing-lifecycle-cron)
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* body vide */
  }

  const token = (body.secret as string | undefined)?.trim() ?? "";
  if (!CRON_SECRET || !timingSafeEqual(token, CRON_SECRET)) {
    console.error("[process-notification-queue] Unauthorized");
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const runId = crypto.randomUUID();
  console.log(
    `[process-notification-queue] Run ${runId} — ${new Date().toISOString()}`
  );

  // Récupérer les emails pending avec retry_count < MAX_RETRIES
  const { data: rows, error: fetchErr } = await admin
    .from("notification_queue")
    .select("id, fleet_id, to_email, template_id, metadata, retry_count")
    .eq("status", "pending")
    .lt("retry_count", MAX_RETRIES)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchErr) {
    console.error(
      "[process-notification-queue] Fetch error:",
      fetchErr.message
    );
    return Response.json(
      { ok: false, error: fetchErr.message },
      { status: 500 }
    );
  }

  const queue = (rows ?? []) as QueueRow[];
  console.log(
    `[process-notification-queue] ${queue.length} email(s) à traiter`
  );

  const stats = { sent: 0, failed: 0, abandoned: 0, skipped: 0 };

  for (const row of queue) {
    const emailPayload = buildEmail(row);

    if (!emailPayload) {
      // Template inconnu → abandonner directement
      await admin
        .from("notification_queue")
        .update({
          status: "abandoned",
          error_msg: `Template inconnu : ${row.template_id}`,
          retry_count: row.retry_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      stats.skipped++;
      continue;
    }

    const result = await sendEmail(emailPayload);

    if (result.ok) {
      await admin
        .from("notification_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      stats.sent++;
      console.log(
        `[process-notification-queue] ✓ Envoyé à ${row.to_email} (${row.template_id})`
      );
    } else {
      const newRetryCount = row.retry_count + 1;
      const newStatus = newRetryCount >= MAX_RETRIES ? "abandoned" : "pending";

      await admin
        .from("notification_queue")
        .update({
          status: newStatus,
          retry_count: newRetryCount,
          error_msg: result.error ?? "Erreur inconnue",
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (newStatus === "abandoned") {
        stats.abandoned++;
        console.warn(
          `[process-notification-queue] ✗ Abandonné ${row.to_email} après ${newRetryCount} tentatives`
        );
      } else {
        stats.failed++;
        console.warn(
          `[process-notification-queue] ✗ Échec ${row.to_email} (retry ${newRetryCount}/${MAX_RETRIES}): ${result.error}`
        );
      }
    }
  }

  console.log(`[process-notification-queue] Done:`, stats);
  return Response.json({ ok: true, runId, processed: queue.length, ...stats });
});
