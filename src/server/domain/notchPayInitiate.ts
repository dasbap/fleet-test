import type { SupabaseClient } from "@supabase/supabase-js";
import { getNotchApiKey, getAppUrl } from "../env.js";
import type {
  NotchPayCreatePaymentRequest,
  NotchPayCreatePaymentResponse,
  NotchPayIntent,
  NotchPayInitiateResult,
} from "../../types/notch-pay.js";
import { assertVehicleCountWithinPlanLimit } from "./billing/vehicleSlotLimits.js";

const NOTCH_PAY_API_URL = "https://api.notchpay.co";

interface PlanRow {
  id: string;
  price_per_vehicle: number;
  max_vehicles: number | null;
  is_active: boolean;
}

/**
 * Appelle l'API Notch Pay pour créer un paiement, puis enregistre le paiement
 * en base avec status=pending. Retourne l'URL de checkout.
 */
export async function initiateNotchPayPayment(
  supabase: SupabaseClient,
  intent: NotchPayIntent,
): Promise<NotchPayInitiateResult> {
  const apiKey = getNotchApiKey();
  if (!apiKey) {
    throw new Error("NOTCH_PAY_API_KEY non configuré.");
  }

  const durationMonths = intent.durationMonths ?? 1;
  if (intent.vehicleCount < 1) {
    throw new Error("Au moins un véhicule est requis.");
  }

  // Récupère le prix du plan
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
  if (amountXaf <= 0) {
    throw new Error("Montant invalide.");
  }

  // Référence idempotente côté marchand (format Notch Pay : alphanumérique sans espaces)
  const merchantRef = `ESAMBA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const callbackUrl = `${getAppUrl()}/dashboard/billing?status=success&ref=${merchantRef}`;

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

  // Appel API Notch Pay
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
    throw new Error(`Notch Pay API error ${notchRes.status}: ${raw}`);
  }

  const notchData = (await notchRes.json()) as NotchPayCreatePaymentResponse;
  const tx = notchData.transaction;
  if (!tx?.authorization_url) {
    throw new Error("Notch Pay n'a pas retourné d'URL de paiement.");
  }

  // La référence retournée par Notch Pay peut différer de merchantRef
  const notchRef = tx.reference ?? merchantRef;

  const rawPayload = {
    planCode: intent.planCode,
    vehicleCount: intent.vehicleCount,
    durationMonths,
    fleetId: intent.fleetId,
    notchRef,
    ...(intent.vehicleIds?.length ? { vehicleIds: intent.vehicleIds } : {}),
  };

  // Enregistrement en base
  const { data, error } = await supabase
    .from("paiements")
    .insert({
      org_id: intent.orgId,
      provider: "notch",
      amount: amountXaf,
      currency: "XAF",
      status: "pending",
      external_ref: notchRef,
      idempotency_key: merchantRef,
      raw_payload: rawPayload,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return {
    paymentId: data.id,
    reference: notchRef,
    checkoutUrl: tx.authorization_url,
    amountXaf,
  };
}
