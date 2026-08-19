import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  canTransitionPaymentStatus,
  normalizeInboundPaymentStatus,
  type PaymentStatus,
} from "../../../lib/billing/paymentStates.js";
import {
  assertVehicleCountWithinPlanLimit,
  resolveRenewedVehicleSlots,
} from "./vehicleSlotLimits.js";

const rawPayloadSchema = z.object({
  planCode: z.string().min(1),
  vehicleCount: z.number().int().positive(),
  durationMonths: z.number().int().positive().max(36).optional(),
  fleetId: z.string().uuid(),
  phoneNumber: z.string().optional(),
  vehicleIds: z.array(z.string().uuid()).optional(),
}).superRefine((payload, ctx) => {
  if (!payload.vehicleIds?.length) return;

  const uniqueVehicleIds = new Set(payload.vehicleIds);
  if (uniqueVehicleIds.size !== payload.vehicleIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["vehicleIds"],
      message: "duplicate_vehicle_ids",
    });
  }
  if (payload.vehicleIds.length !== payload.vehicleCount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["vehicleIds"],
      message: "vehicle_count_mismatch",
    });
  }
});

/** Ajoute des mois calendaires en UTC (facturation). */
export function addCalendarMonthsUtc(base: Date, months: number): Date {
  const capped = Math.min(Math.max(months, 1), 36);
  const d = new Date(base.getTime());
  d.setUTCMonth(d.getUTCMonth() + capped);
  return d;
}

export interface InboundPaymentWebhookResult {
  paymentId: string;
  normalizedStatus: PaymentStatus;
  subscriptionActivated: boolean;
  subscriptionId?: string;
  /** Transition refusée (ex. terminal → autre) : aucune écriture. */
  skippedReason?: "no_transition";
}

type ExpectedPaymentProvider = "manual" | "notch" | "cinetpay";

interface PaymentRow {
  id: string;
  org_id: string;
  provider: string;
  status: string;
  raw_payload: unknown;
}

export async function runInboundPaymentWebhook(
  admin: SupabaseClient,
  externalRef: string,
  rawStatus: string,
  expectedProvider?: ExpectedPaymentProvider,
): Promise<InboundPaymentWebhookResult> {
  const normalized = normalizeInboundPaymentStatus(rawStatus);
  if (!normalized) {
    throw new Error("Statut de paiement inconnu ou non pris en charge.");
  }

  const { data: payment, error: payErr } = await admin
    .from("paiements")
    .select("id, org_id, provider, status, raw_payload")
    .eq("external_ref", externalRef)
    .maybeSingle<PaymentRow>();

  if (payErr) throw new Error(payErr.message);
  if (!payment) throw new Error("Paiement introuvable pour cette référence externe");

  if (expectedProvider && payment.provider !== expectedProvider) {
    throw new Error("Le fournisseur du webhook ne correspond pas au fournisseur du paiement.");
  }

  if (!canTransitionPaymentStatus(payment.status, normalized)) {
    return {
      paymentId: payment.id,
      normalizedStatus: normalized,
      subscriptionActivated: false,
      skippedReason: "no_transition",
    };
  }

  const { error: updErr } = await admin.from("paiements").update({ status: normalized }).eq("id", payment.id);
  if (updErr) throw new Error(updErr.message);

  if (normalized !== "succeeded") {
    const rawPayload = payment.raw_payload as Record<string, unknown> | null;
    const fleetId = rawPayload?.fleetId as string | undefined;
    if (fleetId) {
      await admin.from("billing_events").insert({
        fleet_id: fleetId,
        payment_id: payment.id,
        event_type: normalized === "failed" ? "payment.failed" : "payment.processing",
        payload: { normalized_status: normalized, external_ref: externalRef },
      }).then(() => void 0);
    }
    return {
      paymentId: payment.id,
      normalizedStatus: normalized,
      subscriptionActivated: false,
    };
  }

  const activation = await activateSubscriptionForSucceededPayment(admin, payment);

  const rawPayload2 = payment.raw_payload as Record<string, unknown> | null;
  const fleetId2 = rawPayload2?.fleetId as string | undefined;
  if (fleetId2) {
    await admin.from("billing_events").insert({
      fleet_id: fleetId2,
      payment_id: payment.id,
      subscription_id: activation.subscriptionId ?? null,
      event_type: activation.activated ? "subscription.activated" : "payment.successful",
      payload: {
        external_ref: externalRef,
        subscription_activated: activation.activated,
        subscription_id: activation.subscriptionId,
      },
    }).then(() => void 0);
  }

  return {
    paymentId: payment.id,
    normalizedStatus: normalized,
    subscriptionActivated: activation.activated,
    subscriptionId: activation.subscriptionId,
  };
}

async function activateSubscriptionForSucceededPayment(
  admin: SupabaseClient,
  payment: PaymentRow,
): Promise<{ activated: boolean; subscriptionId?: string }> {
  const { data: already } = await admin.from("abonnements").select("id").eq("payment_id", payment.id).maybeSingle();
  if (already?.id) {
    return { activated: false, subscriptionId: already.id };
  }

  const parsedPayload = rawPayloadSchema.safeParse(payment.raw_payload);
  if (!parsedPayload.success) {
    throw new Error("Impossible d’activer l’abonnement : raw_payload du paiement invalide ou incomplet.");
  }

  const { fleetId, planCode, vehicleCount, durationMonths, vehicleIds } = parsedPayload.data;

  const { data: flotte, error: flotteErr } = await admin
    .from("flottes")
    .select("id, org_id")
    .eq("id", fleetId)
    .maybeSingle<{ id: string; org_id: string }>();

  if (flotteErr) throw new Error(flotteErr.message);
  if (!flotte || flotte.org_id !== payment.org_id) {
    throw new Error("La flotte du paiement ne correspond pas à l’organisation du paiement.");
  }

  const { data: planRow, error: planErr } = await admin
    .from("plans")
    .select("id, code, max_vehicles")
    .eq("code", planCode)
    .eq("is_active", true)
    .maybeSingle<{ id: string; code: string; max_vehicles: number | null }>();

  if (planErr) throw new Error(planErr.message);
  if (!planRow) {
    throw new Error(`Plan actif introuvable pour le code « ${planCode} ».`);
  }

  assertVehicleCountWithinPlanLimit({
    planCode: planRow.code,
    requestedVehicleCount: vehicleCount,
    planMaxVehicles: planRow.max_vehicles,
  });

  if (vehicleIds?.length) {
    const { data: selectedVehicles, error: selectedVehiclesError } = await admin
      .from("vehicules")
      .select("id")
      .eq("fleet_id", fleetId)
      .in("id", vehicleIds)
      .returns<{ id: string }[]>();
    if (selectedVehiclesError) throw new Error(selectedVehiclesError.message);
    if ((selectedVehicles ?? []).length !== vehicleCount) {
      throw new Error("La sélection de véhicules payée ne correspond plus aux véhicules de la flotte.");
    }
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const months = durationMonths ?? 1;

  const { data: activeSub, error: subErr } = await admin
    .from("abonnements")
    .select("id, plan_id, starts_at, ends_at, status, vehicle_slots")
    .eq("fleet_id", fleetId)
    .eq("status", "active")
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; plan_id: string; starts_at: string; ends_at: string; status: string; vehicle_slots: number | null }>();

  if (subErr) throw new Error(subErr.message);

  let subscriptionId: string;
  let startsAtIso: string;
  let endsAtIso: string;

  if (activeSub && activeSub.plan_id === planRow.id) {
    const previousEnd = new Date(activeSub.ends_at);
    const base = previousEnd > now ? previousEnd : now;
    const newEnd = addCalendarMonthsUtc(base, months);
    startsAtIso = activeSub.starts_at;
    endsAtIso = newEnd.toISOString();
    const { error: extErr } = await admin
      .from("abonnements")
      .update({
        ends_at: endsAtIso,
        payment_id: payment.id,
        vehicle_slots: resolveRenewedVehicleSlots({
          currentVehicleSlots: activeSub.vehicle_slots,
          requestedVehicleCount: vehicleCount,
          planMaxVehicles: planRow.max_vehicles,
        }),
      })
      .eq("id", activeSub.id);
    if (extErr) throw new Error(extErr.message);
    subscriptionId = activeSub.id;
  } else {
    if (activeSub) {
      const { error: cancelErr } = await admin
        .from("abonnements")
        .update({ status: "cancelled", ends_at: nowIso })
        .eq("id", activeSub.id);
      if (cancelErr) throw new Error(cancelErr.message);
    }
    startsAtIso = nowIso;
    endsAtIso = addCalendarMonthsUtc(now, months).toISOString();
    const { data: inserted, error: insErr } = await admin
      .from("abonnements")
      .insert({
        fleet_id: fleetId,
        plan_id: planRow.id,
        payment_id: payment.id,
        starts_at: startsAtIso,
        ends_at: endsAtIso,
        status: "active",
        vehicle_slots: vehicleCount,
      })
      .select("id")
      .single<{ id: string }>();
    if (insErr) throw new Error(insErr.message);
    subscriptionId = inserted.id;
  }

  await syncVehicleRights(admin, {
    fleetId,
    subscriptionId,
    vehicleCount,
    vehicleIds,
    startsAtIso,
    endsAtIso,
  });

  return { activated: true, subscriptionId };
}

async function syncVehicleRights(
  admin: SupabaseClient,
  args: {
    fleetId: string;
    subscriptionId: string;
    vehicleCount: number;
    vehicleIds?: string[];
    startsAtIso: string;
    endsAtIso: string;
  },
): Promise<void> {
  const { fleetId, subscriptionId, vehicleCount, vehicleIds, startsAtIso, endsAtIso } = args;

  let ids: string[] = [];
  if (vehicleIds?.length) {
    const { data: inFleet, error: vfErr } = await admin
      .from("vehicules")
      .select("id")
      .eq("fleet_id", fleetId)
      .in("id", vehicleIds)
      .returns<{ id: string }[]>();
    if (vfErr) throw new Error(vfErr.message);
    ids = (inFleet ?? []).map((r) => r.id);
    if (ids.length !== vehicleCount) {
      throw new Error("Impossible d’attribuer plus ou moins de droits véhicules que le nombre payé.");
    }
  } else if (vehicleCount > 0) {
    const { data: rows, error } = await admin
      .from("vehicules")
      .select("id")
      .eq("fleet_id", fleetId)
      .order("created_at", { ascending: true })
      .limit(vehicleCount)
      .returns<{ id: string }[]>();
    if (error) throw new Error(error.message);
    ids = (rows ?? []).map((r) => r.id);
  }

  if (!ids.length) return;

  const droitsRows = ids.map((vehicleId) => ({
    vehicle_id: vehicleId,
    subscription_id: subscriptionId,
    active: true,
    starts_at: startsAtIso,
    ends_at: endsAtIso,
    status: "active",
    is_premium: false,
  }));

  const { error: upErr } = await admin.from("droits_vehicules").upsert(droitsRows, {
    onConflict: "vehicle_id,subscription_id",
  });
  if (upErr) throw new Error(upErr.message);
}
