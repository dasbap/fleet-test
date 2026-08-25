/**
 * Edge Function Supabase : webhook Notch Pay
 *
 * Sécurité :
 *  - Signature HMAC-SHA256 vérifiée en timing-safe (x-notch-signature)
 *  - Idempotence par référence + statut dans payment_attempts
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

type PaymentStatusV2 = "initiated" | "processing" | "successful" | "failed" | "cancelled" | "refunded";

const SUCCESS_ALIASES = new Set(["complete", "completed", "successful", "success", "paid", "succeeded"]);
const FAILED_ALIASES = new Set(["failed", "failure", "declined", "rejected", "error"]);
const PROCESSING_ALIASES = new Set(["processing", "pending", "in_progress", "initiated"]);
const TERMINAL = new Set<PaymentStatusV2>(["successful", "failed", "cancelled", "refunded"]);

function normalizeStatus(raw: string): PaymentStatusV2 | null {
  const s = raw.trim().toLowerCase();
  if (SUCCESS_ALIASES.has(s)) return "successful";
  if (FAILED_ALIASES.has(s)) return "failed";
  if (PROCESSING_ALIASES.has(s)) return "processing";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "refunded") return "refunded";
  return null;
}

function toDatabasePaymentStatus(status: PaymentStatusV2): string {
  if (status === "successful") return "succeeded";
  if (status === "cancelled") return "canceled";
  return status;
}

function canTransition(currentRaw: string, next: PaymentStatusV2): boolean {
  const current = normalizeStatus(currentRaw);
  if (!current || current === next) return true;
  if (!TERMINAL.has(current)) return true;
  return current === "successful" && next === "refunded";
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-notch-signature") ?? "";
  if (!signature) {
    return new Response(JSON.stringify({ error: "x-notch-signature manquante" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!(await verifySignature(rawBody, signature))) {
    return new Response(JSON.stringify({ error: "Signature invalide" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Corps JSON invalide" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

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

  if (currencyFromWebhook && currencyFromWebhook !== "XAF") {
    return new Response(
      JSON.stringify({ error: `Devise non supportée : ${currencyFromWebhook}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

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

  const { data: payment, error: payErr } = await admin
    .from("paiements")
    .select("id, org_id, status, amount, raw_payload")
    .or(`external_ref.eq.${providerReference},provider_reference.eq.${providerReference}`)
    .maybeSingle();

  if (payErr) {
    console.error("[notch-webhook] erreur DB paiement :", payErr.message);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!payment) {
    return new Response(
      JSON.stringify({ error: "Paiement introuvable", reference: providerReference }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (
    amountFromWebhook !== undefined &&
    (!Number.isFinite(amountFromWebhook) || Math.round(amountFromWebhook) !== Number(payment.amount))
  ) {
    console.warn(
      `[notch-webhook] montant incohérent : attendu ${payment.amount}, reçu ${amountFromWebhook}`,
    );
    return new Response(
      JSON.stringify({ error: "Montant webhook incompatible avec le paiement" }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!canTransition(payment.status, normalizedStatus)) {
    return new Response(
      JSON.stringify({ received: true, skipped: true, reason: "terminal_status" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const nextDatabaseStatus = toDatabasePaymentStatus(normalizedStatus);
  if (normalizeStatus(payment.status) !== normalizedStatus) {
    const { data: transitioned, error: transitionError } = await admin
      .from("paiements")
      .update({ status: nextDatabaseStatus, provider_reference: providerReference })
      .eq("id", payment.id)
      .eq("status", payment.status)
      .select("id")
      .maybeSingle();

    if (transitionError) {
      console.error("[notch-webhook] erreur transition paiement :", transitionError.message);
      return new Response(JSON.stringify({ error: "Erreur interne" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!transitioned) {
      return new Response(
        JSON.stringify({ received: true, skipped: true, reason: "concurrent_transition" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const { data: existingAttempt, error: existingAttemptError } = await admin
    .from("payment_attempts")
    .select("id, status")
    .eq("provider_reference", providerReference)
    .maybeSingle();

  if (existingAttemptError) {
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (existingAttempt?.status === normalizedStatus) {
    if (normalizedStatus !== "successful") {
      return new Response(
        JSON.stringify({ received: true, skipped: true, reason: "already_processed" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  } else if (existingAttempt) {
    const { error: attemptUpdateError } = await admin
      .from("payment_attempts")
      .update({
        status: normalizedStatus,
        raw_payload: sanitizeWebhookPayload(payload),
        raw_response: data ? sanitizeWebhookPayload(data) : null,
      })
      .eq("id", existingAttempt.id);
    if (attemptUpdateError) {
      return new Response(JSON.stringify({ error: "Erreur interne" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    const { error: attemptErr } = await admin.from("payment_attempts").insert({
      payment_id: payment.id,
      provider: "notch",
      provider_reference: providerReference,
      status: normalizedStatus,
      raw_payload: sanitizeWebhookPayload(payload),
      raw_response: data ? sanitizeWebhookPayload(data) : null,
    });

    if (attemptErr && attemptErr.code !== "23505") {
      return new Response(JSON.stringify({ error: "Erreur interne" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  let subscriptionActivated = false;
  let subscriptionId: string | undefined;
  let vehicleLicensesCreated = 0;

  if (normalizedStatus === "successful") {
    const { data: claimToken, error: claimError } = await admin.rpc("claim_payment_webhook_effects", {
      p_payment_id: payment.id,
      p_lease_seconds: 900,
    });

    if (claimError) {
      console.error("[notch-webhook] claim effets impossible :", claimError.message);
      return new Response(JSON.stringify({ error: "Erreur interne" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (typeof claimToken !== "string" || claimToken.length === 0) {
      return new Response(
        JSON.stringify({ received: true, skipped: true, reason: "effects_in_progress_or_done" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    try {
      const result = await activateSubscription(admin, payment);
      subscriptionActivated = result.activated;
      subscriptionId = result.subscriptionId;
      vehicleLicensesCreated = result.vehicleLicensesCreated;

      const { data: completed, error: completeError } = await admin.rpc(
        "complete_payment_webhook_effects",
        { p_payment_id: payment.id, p_claim_token: claimToken },
      );
      if (completeError || completed !== true) {
        throw new Error(completeError?.message ?? "payment_effect_completion_failed");
      }
    } catch (error) {
      const { error: releaseError } = await admin.rpc("release_payment_webhook_effects", {
        p_payment_id: payment.id,
        p_claim_token: claimToken,
      });
      if (releaseError) {
        console.error("[notch-webhook] release effets impossible :", releaseError.message);
      }
      console.error("[notch-webhook] activation échouée :", error);
      return new Response(JSON.stringify({ error: "Erreur interne" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

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
    if (!Number.isInteger(o.vehicleCount) || (o.vehicleCount as number) < 1) return null;
    if (typeof o.fleetId !== "string" || !o.fleetId) return null;
    if (
      o.durationMonths !== undefined &&
      (!Number.isInteger(o.durationMonths) || (o.durationMonths as number) < 1 || (o.durationMonths as number) > 36)
    ) return null;
    if (Array.isArray(o.vehicleIds)) {
      if (o.vehicleIds.some((id) => typeof id !== "string")) return null;
      if (new Set(o.vehicleIds as string[]).size !== o.vehicleIds.length) return null;
      if (o.vehicleIds.length !== o.vehicleCount) return null;
    }
    return {
      planCode: o.planCode,
      vehicleCount: o.vehicleCount as number,
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

function assertVehicleCountWithinPlanLimit(
  planCode: string,
  requestedVehicleCount: number,
  planMaxVehicles?: number | null,
): void {
  if (!Number.isInteger(requestedVehicleCount) || requestedVehicleCount < 1) {
    throw new Error("Au moins un vehicule est requis.");
  }
  if (planMaxVehicles !== null && planMaxVehicles !== undefined && requestedVehicleCount > planMaxVehicles) {
    throw new Error(`Le plan ${planCode} est limite a ${planMaxVehicles} vehicule(s).`);
  }
}

function resolveRenewedVehicleSlots(
  currentVehicleSlots: number | null | undefined,
  requestedVehicleCount: number,
  planMaxVehicles?: number | null,
): number {
  assertVehicleCountWithinPlanLimit("selectionne", requestedVehicleCount, planMaxVehicles);
  const nextSlots = Math.max(currentVehicleSlots ?? 0, requestedVehicleCount);
  if (planMaxVehicles !== null && planMaxVehicles !== undefined && nextSlots > planMaxVehicles) {
    throw new Error(`Le plan selectionne est limite a ${planMaxVehicles} vehicule(s).`);
  }
  return Math.max(1, nextSlots);
}

type AdminClient = ReturnType<typeof createClient>;

async function activateSubscription(admin: AdminClient, payment: PaymentRecord): Promise<ActivationResult> {
  const parsed = rawPayloadSchema.parse(payment.raw_payload);
  if (!parsed) {
    throw new Error("raw_payload_invalide");
  }

  const { fleetId, planCode, vehicleCount, durationMonths, vehicleIds } = parsed;

  const { data: existing, error: existingError } = await admin
    .from("abonnements")
    .select("id, starts_at, ends_at")
    .eq("payment_id", payment.id)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing?.id) {
    const licensesCreated = await syncVehicleLicenses(admin, {
      fleetId,
      subscriptionId: existing.id,
      vehicleCount,
      vehicleIds,
      startsAtIso: existing.starts_at,
      endsAtIso: existing.ends_at,
    });
    return { activated: false, subscriptionId: existing.id, vehicleLicensesCreated: licensesCreated };
  }

  const { data: flotte, error: fleetError } = await admin
    .from("flottes")
    .select("id, org_id")
    .eq("id", fleetId)
    .maybeSingle();

  if (fleetError) throw new Error(fleetError.message);
  if (!flotte || flotte.org_id !== payment.org_id) {
    throw new Error("flotte_org_incompatible");
  }

  const { data: plan, error: planError } = await admin
    .from("plans")
    .select("id, code, max_vehicles")
    .eq("code", planCode)
    .eq("is_active", true)
    .maybeSingle();

  if (planError) throw new Error(planError.message);
  if (!plan) throw new Error("plan_introuvable");
  assertVehicleCountWithinPlanLimit(plan.code, vehicleCount, plan.max_vehicles);

  if (vehicleIds?.length) {
    const { data: selectedVehicles, error: selectedVehiclesError } = await admin
      .from("vehicules")
      .select("id")
      .eq("fleet_id", fleetId)
      .in("id", vehicleIds);
    if (selectedVehiclesError) throw new Error(selectedVehiclesError.message);
    if ((selectedVehicles ?? []).length !== vehicleCount) {
      throw new Error("selection_vehicules_invalide");
    }
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const months = durationMonths ?? 1;

  const { data: activeSub, error: activeSubError } = await admin
    .from("abonnements")
    .select("id, plan_id, starts_at, ends_at, vehicle_slots")
    .eq("fleet_id", fleetId)
    .eq("status", "active")
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeSubError) throw new Error(activeSubError.message);

  let subscriptionId: string;
  let startsAtIso: string;
  let endsAtIso: string;

  if (activeSub && activeSub.plan_id === plan.id) {
    const prevEnd = new Date(activeSub.ends_at);
    const base = prevEnd > now ? prevEnd : now;
    endsAtIso = addCalendarMonthsUtc(base, months).toISOString();
    startsAtIso = activeSub.starts_at;
    const { error: updateError } = await admin
      .from("abonnements")
      .update({
        ends_at: endsAtIso,
        payment_id: payment.id,
        status: "active",
        vehicle_slots: resolveRenewedVehicleSlots(activeSub.vehicle_slots, vehicleCount, plan.max_vehicles),
      })
      .eq("id", activeSub.id);
    if (updateError) throw new Error(updateError.message);
    subscriptionId = activeSub.id;
  } else {
    if (activeSub) {
      const { error: cancelError } = await admin
        .from("abonnements")
        .update({ status: "cancelled", ends_at: nowIso })
        .eq("id", activeSub.id);
      if (cancelError) throw new Error(cancelError.message);
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
        vehicle_slots: Math.max(1, vehicleCount),
      })
      .select("id")
      .single();

    if (insErr || !inserted?.id) {
      throw new Error(insErr?.message ?? "creation_abonnement_impossible");
    }
    subscriptionId = inserted.id;
  }

  const licensesCreated = await syncVehicleLicenses(admin, {
    fleetId,
    subscriptionId,
    vehicleCount,
    vehicleIds,
    startsAtIso,
    endsAtIso,
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
    const { data: inFleet, error: inFleetError } = await admin
      .from("vehicules")
      .select("id")
      .eq("fleet_id", fleetId)
      .in("id", vehicleIds);
    if (inFleetError) throw new Error(inFleetError.message);
    ids = (inFleet ?? []).map((r: { id: string }) => r.id);
    if (ids.length !== vehicleCount) throw new Error("selection_vehicules_invalide");
  } else if (vehicleCount > 0) {
    const { data: rows, error: rowsError } = await admin
      .from("vehicules")
      .select("id")
      .eq("fleet_id", fleetId)
      .order("created_at", { ascending: true })
      .limit(vehicleCount);
    if (rowsError) throw new Error(rowsError.message);
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

  if (error) throw new Error(error.message);
  return ids.length;
}
