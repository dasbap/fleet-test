/**
 * Edge Function : otp-send
 *
 * Valide le numéro, vérifie le rate limit, déclenche l'OTP Supabase.
 * Sert de couche anti-spam avant l'envoi SMS/WhatsApp.
 *
 * POST /functions/v1/otp-send
 * Body : { phone: string, channel?: 'sms' | 'whatsapp' }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const COOLDOWN_SECONDS  = 60;

// ─── Validation E164 ──────────────────────────────────────────────────────────

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

// Pays CEMAC acceptés
const ALLOWED_DIAL_CODES = ['+237', '+243', '+241', '+242', '+236', '+235', '+240'];

function isAllowedCountry(phone: string): boolean {
  return ALLOWED_DIAL_CODES.some((code) => phone.startsWith(code));
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return respond({ ok: false, message: 'Méthode non autorisée.' }, 405);
  }

  let body: { phone?: string; channel?: string };
  try {
    body = await req.json();
  } catch {
    return respond({ ok: false, message: 'Corps de requête invalide.' }, 400);
  }

  const { phone, channel = 'sms' } = body;

  // ── Validation du numéro ─────────────────────────────────────────────────────

  if (!phone || typeof phone !== 'string') {
    return respond({ ok: false, reason: 'invalid_phone', message: 'Numéro de téléphone requis.' }, 400);
  }

  const normalized = phone.trim();

  if (!E164_REGEX.test(normalized)) {
    return respond({
      ok:      false,
      reason:  'invalid_phone',
      message: 'Format invalide. Utilisez le format international (ex: +237612345678).',
    }, 400);
  }

  if (!isAllowedCountry(normalized)) {
    return respond({
      ok:      false,
      reason:  'invalid_phone',
      message: 'Pays non supporté. E-Samba est disponible au Cameroun et en Afrique Centrale.',
    }, 400);
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────────

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  const { data: rateCheck, error: rateErr } = await admin
    .rpc('otp_can_send', { p_phone: normalized });

  if (rateErr) {
    console.error('[otp-send] rate check error:', rateErr);
    return respond({ ok: false, reason: 'unknown', message: 'Erreur interne. Réessayez.' }, 500);
  }

  if (!rateCheck?.allowed) {
    return respond({
      ok:         false,
      reason:     'rate_limited',
      message:    rateCheck?.message ?? 'Trop de tentatives. Réessayez plus tard.',
      retryAfter: COOLDOWN_SECONDS,
    }, 429);
  }

  // ── Envoi OTP via Supabase Auth ───────────────────────────────────────────────

  const { error: otpErr } = await admin.auth.admin.generateLink({
    type:  'phone_change',
    phone: normalized,
  });

  // Fallback : utiliser signInWithOtp si generateLink non disponible
  let sendError = otpErr;
  if (otpErr?.message?.includes('phone_change')) {
    const { error: signInErr } = await admin.auth.signInWithOtp({
      phone:   normalized,
      options: { channel: channel as 'sms' | 'whatsapp' },
    });
    sendError = signInErr ?? null;
  }

  if (sendError) {
    console.error('[otp-send] OTP send error:', sendError);
    // Enregistrer quand même la tentative pour le rate limiting
    await admin.rpc('otp_record_attempt', {
      p_phone:  normalized,
      p_action: 'send',
      p_meta:   { channel, success: false, error: sendError.message },
    });
    return respond({
      ok:      false,
      reason:  'provider_error',
      message: 'Impossible d\'envoyer le code. Vérifiez votre numéro et réessayez.',
    }, 502);
  }

  // ── Enregistrer la tentative réussie ──────────────────────────────────────────

  await admin.rpc('otp_record_attempt', {
    p_phone:  normalized,
    p_action: 'send',
    p_meta:   { channel, success: true },
  });

  return respond({
    ok:          true,
    channel,
    retryAfter:  COOLDOWN_SECONDS,
    maskedPhone: `${normalized.slice(0, 4)}${'•'.repeat(normalized.length - 7)}${normalized.slice(-3)}`,
  });
});
