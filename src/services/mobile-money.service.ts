import { supabase } from "@/integrations/supabase/client";

export type MoMoProvider = "orange_money" | "mtn_momo";

export interface MoMoPaymentIntent {
  orgId: string;
  fleetId: string;
  provider: MoMoProvider;
  phoneNumber: string;
  amountXaf: number;
  planCode: string;
  vehicleCount: number;
  /** Months covered by this payment (default 1) */
  durationMonths?: number;
}

export interface MoMoPaymentResult {
  paymentId: string;
  reference: string;
  instructions: MoMoInstructions;
}

export interface MoMoInstructions {
  provider: MoMoProvider;
  providerLabel: string;
  amountXaf: number;
  reference: string;
  recipientName: string;
  recipientPhone: string;
  steps: string[];
}

const ESAMBA_ORANGE_MONEY_PHONE = "6XX XXX XXX"; // Set real number in production
const ESAMBA_MTN_MOMO_PHONE = "6XX XXX XXX";   // Set real number in production

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
        `Envoyez la capture par WhatsApp ou email à support@e-samba.com`,
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
      `Envoyez la capture par WhatsApp ou email à support@e-samba.com`,
    ],
  };
}

export class MobileMoneyService {
  /**
   * Crée un paiement en attente dans Supabase et retourne les instructions MoMo.
   * La validation est manuelle (support) ou via webhook futur.
   */
  async initiatePayment(intent: MoMoPaymentIntent): Promise<MoMoPaymentResult> {
    const reference = `ESAMBA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const idempotencyKey = crypto.randomUUID();

    const rawPayload = {
      planCode: intent.planCode,
      vehicleCount: intent.vehicleCount,
      durationMonths: intent.durationMonths ?? 1,
      phoneNumber: intent.phoneNumber,
      fleetId: intent.fleetId,
    };

    const { data, error } = await supabase
      .from("paiements")
      .insert({
        org_id: intent.orgId,
        provider: intent.provider,
        amount: intent.amountXaf,
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
      instructions: buildInstructions(intent.provider, intent.amountXaf, reference),
    };
  }
}
