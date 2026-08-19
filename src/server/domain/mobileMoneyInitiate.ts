import type { SupabaseClient } from "@supabase/supabase-js";
import type { MoMoInstructions, MoMoPaymentIntent, MoMoPaymentResult, MoMoProvider } from "../../types/mobile-money.js";
import { assertCanManageBillingForFleet } from "./billing/billingAuthorization.js";
import { assertVehicleCountWithinPlanLimit } from "./billing/vehicleSlotLimits.js";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@e-samba.com";
const ESAMBA_ORANGE_MONEY_PHONE = "6XX XXX XXX";
const ESAMBA_MTN_MOMO_PHONE = "6XX XXX XXX";

function assertSelectedVehiclesMatchChargedCount(vehicleIds: string[] | undefined, vehicleCount: number): void {
  if (!vehicleIds?.length) return;

  const uniqueVehicleIds = new Set(vehicleIds);
  if (uniqueVehicleIds.size !== vehicleIds.length) {
    throw new Error("La sélection de véhicules contient des doublons.");
  }
  if (vehicleIds.length !== vehicleCount) {
    throw new Error("Le nombre de véhicules sélectionnés doit correspondre au nombre de véhicules facturés.");
  }
}

function buildInstructions(
  provider: MoMoProvider,
  amountXaf: number,
  reference: string,
): MoMoInstructions {
  if (provider === "orange_money") {
    return {
      provider,
      providerLabel: "Orange Money",
      amountXaf,
      reference,
      recipientName: "E-Samba SAS",
      recipientPhone: ESAMBA_ORANGE_MONEY_PHONE,
      steps: [
        `Composez #150*50# sur votre téléphone Orange`,
        `Sélectionnez « Payer » → « Marchand »`,
        `Saisissez le numéro : ${ESAMBA_ORANGE_MONEY_PHONE}`,
        `Entrez le montant : ${amountXaf.toLocaleString("fr-FR")} FCFA`,
        `Saisissez votre code PIN Orange Money`,
        `Gardez la capture du SMS de confirmation — référence : ${reference}`,
        `Envoyez la capture par WhatsApp ou email à ${SUPPORT_EMAIL}`,
      ],
    };
  }
  return {
    provider,
    providerLabel: "MTN MoMo",
    amountXaf,
    reference,
    recipientName: "E-Samba SAS",
    recipientPhone: ESAMBA_MTN_MOMO_PHONE,
    steps: [
      `Composez *126# sur votre téléphone MTN`,
      `Sélectionnez « Transfert d'argent »`,
      `Saisissez le numéro : ${ESAMBA_MTN_MOMO_PHONE}`,
      `Entrez le montant : ${amountXaf.toLocaleString("fr-FR")} FCFA`,
      `Saisissez votre code PIN MoMo`,
      `Gardez la capture du SMS de confirmation — référence : ${reference}`,
      `Envoyez la capture par WhatsApp ou email à ${SUPPORT_EMAIL}`,
    ],
  };
}

export async function initiateMobileMoneyPaymentForUser(
  supabase: SupabaseClient,
  intent: MoMoPaymentIntent,
): Promise<MoMoPaymentResult> {
  const durationMonths = intent.durationMonths ?? 1;
  await assertCanManageBillingForFleet(supabase, intent);

  if (intent.vehicleCount < 1) {
    throw new Error("Au moins un vehicule est requis.");
  }
  assertSelectedVehiclesMatchChargedCount(intent.vehicleIds, intent.vehicleCount);

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, code, price_per_vehicle, max_vehicles, is_active")
    .eq("code", intent.planCode.trim())
    .maybeSingle<{
      id: string;
      code: string;
      price_per_vehicle: number;
      max_vehicles: number | null;
      is_active: boolean;
    }>();

  if (planError) throw new Error(planError.message);
  if (!plan || !plan.is_active) {
    throw new Error("Plan introuvable ou inactif.");
  }
  assertVehicleCountWithinPlanLimit({
    planCode: plan.code,
    requestedVehicleCount: intent.vehicleCount,
    planMaxVehicles: plan.max_vehicles,
  });

  const amountXaf = plan.price_per_vehicle * intent.vehicleCount * durationMonths;
  if (amountXaf <= 0) {
    throw new Error("Montant invalide.");
  }

  const referenceEntropy = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  const reference = `ESAMBA-${Date.now().toString(36).toUpperCase()}-${referenceEntropy}`;
  const idempotencyKey = crypto.randomUUID();

  const rawPayload = {
    planCode: intent.planCode,
    vehicleCount: intent.vehicleCount,
    durationMonths,
    phoneNumber: intent.phoneNumber,
    fleetId: intent.fleetId,
    ...(intent.vehicleIds?.length ? { vehicleIds: intent.vehicleIds } : {}),
  };

  const { data, error } = await supabase
    .from("paiements")
    .insert({
      org_id: intent.orgId,
      provider: intent.provider,
      amount: amountXaf,
      currency: "XAF",
      status: "pending",
      external_ref: reference,
      idempotency_key: idempotencyKey,
      raw_payload: rawPayload,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return {
    paymentId: data.id,
    reference,
    instructions: buildInstructions(intent.provider, amountXaf, reference),
  };
}
