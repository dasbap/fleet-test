/**
 * Edge Function Supabase : webhook Notch Pay
 *
 * Sécurité :
 *  - Signature HMAC-SHA256 vérifiée en timing-safe (x-notch-signature)
 *  - Idempotence stricte via UNIQUE(provider_reference) dans payment_attempts
 *  - Activation abonnement uniquement via service_role (backend only)
 *  - Aucune confiance aux données frontend
 *
 * Variables ENV (Supabase secrets) :
 *  - NOTCH_PAY_WEBHOOK_SECRET : clé utilisée pour HMAC-SHA256
 *  - SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const NOTCH_PAY_WEBHOOK_SECRET = Deno.env.get("NOTCH_PAY_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ─── Vérification signature ─────────────────────────────────

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function verifySignature(rawBody: string, sig: string): Promise<boolean> {
  if (!NOTCH_PAY_WEBHOOK_SECRET) return false;
  const expected = await hmacSha256Hex(NOTCH_PAY_WEBHOOK_SECRET, rawBody);
  return timingSafeEqual(sig.toLowerCase(), expected.toLowerCase());
}

// ─── Normalisation statut Notch Pay ────────────────────────

type PaymentStatusV2 = "initiated" | "processing" | "successful" | "failed" | "cancelled" | "refunded";

const SUCCESS_ALIASES = new Set(["complete", "completed", "successful", "success", "paid", "succeeded"]);
const FAILED_ALIASES = new Set(["failed", "failure", "declined", "rejected", "error"]);
const PROCESSING_ALIASES = new Set(["processing", "pending", "in_progress", "initiated"]);

function normalizeStatus(raw: string): PaymentStatusV2 | null {
  const s = raw.trim().toLowerCase();
  if (SUCCESS_ALIASES.has(s)) return "successful";
  if (FAILED_ALIASES.has(s)) return "failed";
  if (PROCESSING_ALIASES.has(s)) return "processing";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "refunded") return "refunded";
  return null;
}

// ─── Handler principal ──────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await req.text();

  // 1. Vérification signature
  const signature = req.headers.get("x-notch-signature") ?? "";
  if (!signature) {
    console.warn("[notch-webhook] signature manquante");
    return new Response(JSON.stringify({ error: "x-notch-signature manquante" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const signatureValid = await verifySignature(rawBody, signature);
  if (!signatureValid) {
    console.warn("[notch-webhook] signature invalide");
    return new Response(JSON.stringify({ error: "Signature invalide" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Parse body
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Corps JSON invalide" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Format Notch Pay : { event: "payment.complete", data: { reference, status, amount, currency, ... } }
  const data = payload.data as Record<string, unknown> | undefined;
  const providerReference = (data?.reference as string | undefined)?.trim();
  const rawStatus = (data?.status as string | undefined)?.trim();
  const amountFromWebhook = data?.amount as number | undefined;
  const currencyFromWebhook = (data?.currency as string | undefined)?.toUpperCase();

  if (!providerReference || !rawStatus) {
    return new Response(
      JSON.stringify({ error: "Champs data.reference et data.status requis" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const normalizedStatus = normalizeStatus(rawStatus);
  if (!normalizedStatus) {
    return new Response(
      JSON.stringify({ error: `Statut inconnu : ${rawStatus}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Validation devise
  if (currencyFromWebhook && currencyFromWebhook !== "XAF") {
    console.warn(`[notch-webhook] devise inattendue : ${currencyFromWebhook}`);
    return new Response(
      JSON.stringify({ error: `Devise non supportée : ${currencyFromWebhook}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Sanitise le payload avant stockage : retire les champs PII (téléphone, email,
  // adresse) du webhook Notch Pay pour respecter les exigences de minimisation RGPD.
  // On conserve uniquement les champs nécessaires à l'audit technique.
  function sanitizeWebhookPayload(raw: Record<string, unknown>): Record<string, unknown> {
    const piiKeys = new Set(["phone", "email", "name", "customer", "address", "ip"]);
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (piiKeys.has(k.toLowerCase())) continue;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        result[k] = sanitizeWebhookPayload(v as Record<string, unknown>);
      } else {
        result[k] = v;
      }
    }
    return result;
  }

  // 3. Idempotence stricte via payment_attempts.provider_reference (UNIQUE)
  const { data: existingAttempt } = await admin
    .from("payment_attempts")
    .select("id, status")
    .eq("provider_reference", providerReference)
    .maybeSingle();

  if (existingAttempt) {
    console.info(`[notch-webhook] doublon ignoré : ${providerReference}`);
    return new Response(
      JSON.stringify({ received: true, skipped: true, reason: "already_processed" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // 4. Retrouver le paiement interne via external_ref ou provider_reference
  const { data: payment, error: payErr } = await admin
    .from("paiements")
    .select("id, org_id, status, amount, raw_payload")
    .or(`external_ref.eq.${providerReference},provider_reference.eq.${providerReference}`)
    .maybeSingle();

  if (payErr) {
    console.error("[notch-webhook] erreur DB paiement :", payErr.message);
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!payment) {
    // Paiement introuvable — on log dans billing_events si une flotte est trouvable via le ref,
    // sinon on retourne 400 sans écriture (payment_id NOT NULL empêche l'insert dans payment_attempts).
    console.warn(`[notch-webhook] paiement introuvable pour ref : ${providerReference}`);
    return new Response(
      JSON.stringify({ error: "Paiement introuvable", reference: providerReference }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // 5. Validation montant (avertissement, pas blocage — tolérance réseau)
  if (amountFromWebhook !== undefined && Math.round(amountFromWebhook) !== payment.amount) {
    console.warn(
      `[notch-webhook] montant incohérent : attendu ${payment.amount}, reçu ${amountFromWebhook}`,
    );
  }

  // 6. Enregistrement tentative (idempotence garantie par UNIQUE provider_reference)
  const { error: attemptErr } = await admin.from("payment_attempts").insert({
    payment_id: payment.id,
    provider: "notch",
    provider_reference: providerReference,
    status: normalizedStatus,
    raw_payload: sanitizeWebhookPayload(payload),   // PII retirés
    raw_response: data ? sanitizeWebhookPayload(data as Record<string, unknown>) : null,
  });

  if (attemptErr) {
    // Conflict = doublon concurrentiel (INSERT UNIQUE violation)
    if (attemptErr.code === "23505") {
      return new Response(
        JSON.stringify({ received: true, skipped: true, reason: "duplicate_concurrent" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    console.error("[notch-webhook] erreur insert attempt :", attemptErr.message);
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // 7. Mise à jour statut paiement (si non terminal)
  const TERMINAL = new Set(["successful", "failed", "cancelled", "refunded"]);
  if (!TERMINAL.has(payment.status)) {
    await admin.from("paiements").update({
      status: normalizedStatus,
      provider_reference: providerReference,
    }).eq("id", payment.id);
  }

  // 8. Si successful → activation abonnement + droits véhicules
  let subscriptionActivated = false;
  let subscriptionId: string | undefined;
  let vehicleLicensesCreated = 0;

  if (normalizedStatus === "successful") {
    const result = await activateSubscription(admin, payment);
    subscriptionActivated = result.activated;
    subscriptionId = result.subscriptionId;
    vehicleLicensesCreated = result.vehicleLicensesCreated;
  }

  // 9. Billing event
  const rawPayload = payment.raw_payload as Record<string, unknown> | null;
  const fleetId = rawPayload?.fleetId as string | undefined;

  if (fleetId) {
    await admin.from("billing_events").insert({
      fleet_id: fleetId,
      payment_id: payment.id,
      subscription_id: subscriptionId ?? null,
      event_type: normalizedStatus === "successful"
        ? "payment.successful"
        : normalizedStatus === "failed"
          ? "payment.failed"
          : "payment.processing",
      payload: {
        provider: "notch",
        provider_reference: providerReference,
        amount: payment.amount,
        normalized_status: normalizedStatus,
        subscription_activated: subscriptionActivated,
        vehicle_licenses_created: vehicleLicensesCreated,
      },
    });
  }

  console.info(
    `[notch-webhook] traité : ${providerReference} → ${normalizedStatus}` +
    (subscriptionActivated ? ` | sub activé : ${subscriptionId}` : ""),
  );

  return new Response(
    JSON.stringify({
      received: true,
      paymentId: payment.id,
      normalizedStatus,
      subscriptionActivated,
      subscriptionId: subscriptionId ?? null,
      vehicleLicensesCreated,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

// ─── Activation abonnement ──────────────────────────────────

interface PaymentRecord {
  id: string;
  org_id: string;
  status: string;
  amount: number;
  raw_payload: unknown;
}

interface ActivationResult {
  activated: boolean;
  subscriptionId?: string;
  vehicleLicensesCreated: number;
}

const rawPayloadSchema = {
  parse(obj: unknown): { planCode: string; vehicleCount: number; durationMonths: number; fleetId: string; vehicleIds?: string[] } | null {
    if (!obj || typeof obj !== "object") return null;
    const o = obj as Record<string, unknown>;
    if (typeof o.planCode !== "string" || !o.planCode) return null;
    if (typeof o.vehicleCount !== "number" || o.vehicleCount < 0) return null;
    if (typeof o.fleetId !== "string" || !o.fleetId) return null;
    return {
      planCode: o.planCode,
      vehicleCount: o.vehicleCount,
      durationMonths: typeof o.durationMonths === "number" ? o.durationMonths : 1,
      fleetId: o.fleetId,
      vehicleIds: Array.isArray(o.vehicleIds) ? (o.vehicleIds as string[]) : undefined,
    };
  },
};

function addCalendarMonthsUtc(base: Date, months: number): Date {
  const capped = Math.min(Math.max(months, 1), 36);
  const d = new Date(base.getTime());
  d.setUTCMonth(d.getUTCMonth() + capped);
  return d;
}

// deno-lint-ignore no-explicit-any
type AdminClient = any;

async function activateSubscription(admin: AdminClient, payment: PaymentRecord): Promise<ActivationResult> {
  // Idempotence : abonnement déjà lié à ce paiement
  const { data: existing } = await admin
    .from("abonnements")
    .select("id")
    .eq("payment_id", payment.id)
    .maybeSingle();

  if (existing?.id) {
    return { activated: false, subscriptionId: existing.id, vehicleLicensesCreated: 0 };
  }

  const parsed = rawPayloadSchema.parse(payment.raw_payload);
  if (!parsed) {
    console.error("[notch-webhook] raw_payload invalide pour activation :", payment.id);
    return { activated: false, vehicleLicensesCreated: 0 };
  }

  const { fleetId, planCode, vehicleCount, durationMonths, vehicleIds } = parsed;

  // Vérifier que la flotte appartient à l'organisation du paiement
  const { data: flotte } = await admin
    .from("flottes")
    .select("id, org_id")
    .eq("id", fleetId)
    .maybeSingle();

  if (!flotte || flotte.org_id !== payment.org_id) {
    console.error("[notch-webhook] flotte/org mismatch pour paiement :", payment.id);
    return { activated: false, vehicleLicensesCreated: 0 };
  }

  // Récupérer le plan
  const { data: plan } = await admin
    .from("plans")
    .select("id")
    .eq("code", planCode)
    .eq("is_active", true)
    .maybeSingle();

  if (!plan) {
    console.error("[notch-webhook] plan introuvable :", planCode);
    return { activated: false, vehicleLicensesCreated: 0 };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const months = durationMonths ?? 1;

  // Abonnement actif existant pour cette flotte ?
  const { data: activeSub } = await admin
    .from("abonnements")
    .select("id, plan_id, starts_at, ends_at")
    .eq("fleet_id", fleetId)
    .eq("status", "active")
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let subscriptionId: string;
  let startsAtIso: string;
  let endsAtIso: string;

  if (activeSub && activeSub.plan_id === plan.id) {
    // Prolongation du même plan
    const prevEnd = new Date(activeSub.ends_at);
    const base = prevEnd > now ? prevEnd : now;
    endsAtIso = addCalendarMonthsUtc(base, months).toISOString();
    startsAtIso = activeSub.starts_at;
    await admin
      .from("abonnements")
      .update({ ends_at: endsAtIso, payment_id: payment.id, status: "active" })
      .eq("id", activeSub.id);
    subscriptionId = activeSub.id;
  } else {
    // Annuler l'abonnement actif existant (plan différent) puis en créer un nouveau
    if (activeSub) {
      await admin
        .from("abonnements")
        .update({ status: "cancelled", ends_at: nowIso })
        .eq("id", activeSub.id);
    }
    startsAtIso = nowIso;
    endsAtIso = addCalendarMonthsUtc(now, months).toISOString();
    const { data: inserted, error: insErr } = await admin
      .from("abonnements")
      .insert({
        fleet_id: fleetId,
        plan_id: plan.id,
        payment_id: payment.id,
        starts_at: startsAtIso,
        ends_at: endsAtIso,
        status: "active",
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("[notch-webhook] erreur création abonnement :", insErr.message);
      return { activated: false, vehicleLicensesCreated: 0 };
    }
    subscriptionId = inserted.id;
  }

  // Licences véhicules
  const licensesCreated = await syncVehicleLicenses(admin, {
    fleetId, subscriptionId, vehicleCount, vehicleIds, startsAtIso, endsAtIso,
  });

  return { activated: true, subscriptionId, vehicleLicensesCreated: licensesCreated };
}

async function syncVehicleLicenses(
  admin: AdminClient,
  args: {
    fleetId: string;
    subscriptionId: string;
    vehicleCount: number;
    vehicleIds?: string[];
    startsAtIso: string;
    endsAtIso: string;
  },
): Promise<number> {
  const { fleetId, subscriptionId, vehicleCount, vehicleIds, startsAtIso, endsAtIso } = args;
  let ids: string[] = [];

  if (vehicleIds?.length) {
    const { data: inFleet } = await admin
      .from("vehicules")
      .select("id")
      .eq("fleet_id", fleetId)
      .in("id", vehicleIds);
    ids = (inFleet ?? []).map((r: { id: string }) => r.id);
  } else if (vehicleCount > 0) {
    const { data: rows } = await admin
      .from("vehicules")
      .select("id")
      .eq("fleet_id", fleetId)
      .order("created_at", { ascending: true })
      .limit(vehicleCount);
    ids = (rows ?? []).map((r: { id: string }) => r.id);
  }

  if (!ids.length) return 0;

  const rows = ids.map((vehicleId) => ({
    vehicle_id: vehicleId,
    subscription_id: subscriptionId,
    active: true,
    starts_at: startsAtIso,
    ends_at: endsAtIso,
    status: "active",
    is_premium: false,
  }));

  const { error } = await admin
    .from("droits_vehicules")
    .upsert(rows, { onConflict: "vehicle_id,subscription_id" });

  if (error) {
    console.error("[notch-webhook] erreur sync licences :", error.message);
    return 0;
  }

  return ids.length;
}
