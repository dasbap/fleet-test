import type { SupabaseClient } from "@supabase/supabase-js";
import { getNotchApiKey, getAppUrl } from "../env.js";
import type {
  NotchPayCreatePaymentRequest,
  NotchPayCreatePaymentResponse,
  NotchPayIntent,
  NotchPayInitiateResult,
} from "../../types/notch-pay.js";
import { assertCanManageBillingForFleet } from "./billing/billingAuthorization.js";
import { createServerOwnedPaymentIntent } from "./billing/paymentIntent.js";
import { assertVehicleCountWithinPlanLimit } from "./billing/vehicleSlotLimits.js";

const NOTCH_PAY_API_URL = "https://api.notchpay.co";
const MAX_DURATION_MONTHS = 36;

interface PlanRow {
  id: string;
  price_per_vehicle: number;
  max_vehicles: number | null;
  is_active: boolean;
}

function assertSelectedVehiclesMatchChargedCount(vehicleIds: string[] | undefined, vehicleCount: number): void {
  if (!vehicleIds?.length) return;

  const uniqueVehicleIds = new Set(vehicleIds);
  if (uniqueVehicleIds.size !== vehicleIds.length) {
    throw new Error("La selection de vehicules contient des doublons.");
  }
  if (vehicleIds.length !== vehicleCount) {
    throw new Error("Le nombre de vehicules selectionnes doit correspondre au nombre de vehicules factures.");
  }
}

async function assertSelectedVehiclesBelongToFleet(
  supabase: SupabaseClient,
  fleetId: string,
  vehicleIds: string[] | undefined,
  vehicleCount: number,
): Promise<void> {
  if (!vehicleIds?.length) return;

  const { data, error } = await supabase
    .from("vehicules")
    .select("id")
    .eq("fleet_id", fleetId)
    .in("id", vehicleIds)
    .returns<{ id: string }[]>();

  if (error) throw new Error(error.message);
  if ((data ?? []).length !== vehicleCount) {
    throw new Error("La selection de vehicules ne correspond pas aux vehicules de la flotte.");
  }
}

export async function initiateNotchPayPayment(
  supabase: SupabaseClient,
  intent: NotchPayIntent,
): Promise<NotchPayInitiateResult> {
  const apiKey = getNotchApiKey();
  if (!apiKey) {
    throw new Error("NOTCH_PAY_API_KEY non configuré.");
  }

  const durationMonths = intent.durationMonths ?? 1;
  await assertCanManageBillingForFleet(supabase, intent);

  if (intent.vehicleCount < 1) {
    throw new Error("Au moins un véhicule est requis.");
  }
  if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > MAX_DURATION_MONTHS) {
    throw new Error("La durée de facturation doit être comprise entre 1 et 36 mois.");
  }

  assertSelectedVehiclesMatchChargedCount(intent.vehicleIds, intent.vehicleCount);
  await assertSelectedVehiclesBelongToFleet(
    supabase,
    intent.fleetId,
    intent.vehicleIds,
    intent.vehicleCount,
  );

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, price_per_vehicle, max_vehicles, is_active")
    .eq("code", intent.planCode.trim())
    .maybeSingle<PlanRow>();

  if (planError) throw new Error(planError.message);
  if (!plan || !plan.is_active) {
    throw new Error("Plan introuvable ou inactif.");
  }
  assertVehicleCountWithinPlanLimit({
    planCode: intent.planCode,
    requestedVehicleCount: intent.vehicleCount,
    planMaxVehicles: plan.max_vehicles,
  });

  const amountXaf = plan.price_per_vehicle * intent.vehicleCount * durationMonths;
  if (!Number.isFinite(amountXaf) || amountXaf <= 0) {
    throw new Error("Montant invalide.");
  }

  const referenceEntropy = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  const merchantRef = `ESAMBA-${Date.now().toString(36).toUpperCase()}-${referenceEntropy}`;
  const callbackUrl = `${getAppUrl()}/dashboard/billing?status=success&ref=${encodeURIComponent(merchantRef)}`;

  const payload: NotchPayCreatePaymentRequest = {
    amount: amountXaf,
    currency: "XAF",
    reference: merchantRef,
    description: `Abonnement E-Samba — plan ${intent.planCode} (${intent.vehicleCount} véhicule(s), ${durationMonths} mois)`,
    callback: callbackUrl,
    ...(intent.phone ? { phone: intent.phone } : {}),
    ...(intent.email ? { email: intent.email } : {}),
    metadata: {
      fleetId: intent.fleetId,
      orgId: intent.orgId,
      planCode: intent.planCode,
      vehicleCount: String(intent.vehicleCount),
      durationMonths: String(durationMonths),
    },
  };

  const notchRes = await fetch(`${NOTCH_PAY_API_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!notchRes.ok) {
    const raw = await notchRes.text().catch(() => "");
    throw new Error(`Notch Pay API error ${notchRes.status}: ${raw.slice(0, 500)}`);
  }

  const notchData = (await notchRes.json()) as NotchPayCreatePaymentResponse;
  const tx = notchData.transaction;
  if (!tx?.authorization_url) {
    throw new Error("Notch Pay n'a pas retourné d'URL de paiement.");
  }

  const notchRef = tx.reference ?? merchantRef;

  const payment = await createServerOwnedPaymentIntent(supabase, {
    orgId: intent.orgId,
    fleetId: intent.fleetId,
    planCode: intent.planCode,
    vehicleCount: intent.vehicleCount,
    durationMonths,
    provider: "notch",
    externalRef: notchRef,
    idempotencyKey: merchantRef,
    expectedAmountXaf: amountXaf,
    vehicleIds: intent.vehicleIds,
    phoneNumber: intent.phone,
  });

  return {
    paymentId: payment.paymentId,
    reference: notchRef,
    checkoutUrl: tx.authorization_url,
    amountXaf: payment.amountXaf,
  };
}
