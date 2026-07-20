import { getBffBaseUrl, isBffConfigured } from "@/lib/bff-config";
import { SUPPORT } from "@/config/navigation";
import { supabase } from "@/integrations/supabase/client";
import {
  PaymentTransactionRepository,
  type PaymentProvider,
  type PaymentTransaction,
} from "@/repositories/payment-transaction.repository";
import type {
  MoMoInstructions,
  MoMoPaymentIntent,
  MoMoPaymentResult,
  MoMoProvider,
} from "@/types/mobile-money";

export type { MoMoPaymentIntent, MoMoPaymentResult, MoMoInstructions, MoMoProvider } from "@/types/mobile-money";

const ESAMBA_ORANGE_MONEY_PHONE = "6XX XXX XXX"; // Set real number in production
const ESAMBA_MTN_MOMO_PHONE = "6XX XXX XXX"; // Set real number in production

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
        `Envoyez la capture par WhatsApp ou email à ${SUPPORT.email}`,
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
      `Envoyez la capture par WhatsApp ou email à ${SUPPORT.email}`,
    ],
  };
}

export interface MobileMoneyRequestOptions {
  accessToken?: string | null;
}

export interface StartMobileMoneyPaymentInput {
  fleetId: string;
  provider: PaymentProvider;
  amountXaf: number;
  phoneNumber: string;
  merchantCode: string;
}

export class MobileMoneyService {
  constructor(private readonly paymentTxRepository?: PaymentTransactionRepository) {}

  /**
   * Flux upgrade (table `payment_transactions`) — nécessite le repository injecté.
   */
  async startPayment(input: StartMobileMoneyPaymentInput): Promise<PaymentTransaction> {
    if (!this.paymentTxRepository) {
      throw new Error("PaymentTransactionRepository requis pour ce flux.");
    }
    const reference = `MM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { fleetId, provider, amountXaf } = input;
    return this.paymentTxRepository.create({
      fleet_id: fleetId,
      provider,
      amount_xaf: amountXaf,
      reference,
    });
  }

  async confirmPayment(transactionId: string, success = true): Promise<PaymentTransaction> {
    if (!this.paymentTxRepository) {
      throw new Error("PaymentTransactionRepository requis pour ce flux.");
    }
    return this.paymentTxRepository.updateStatus(transactionId, success ? "completed" : "failed");
  }

  /**
   * Crée un paiement en attente dans Supabase et retourne les instructions MoMo.
   * La validation est manuelle (support) ou via webhook futur.
   */
  async initiatePayment(
    intent: MoMoPaymentIntent,
    options?: MobileMoneyRequestOptions,
  ): Promise<MoMoPaymentResult> {
    const bff = getBffBaseUrl();
    if (isBffConfigured() && options?.accessToken) {
      const url = `${bff ?? ""}/billing/mobile-money/initiate`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.accessToken}`,
        },
        body: JSON.stringify(intent),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erreur API Mobile Money (${res.status})`);
      }
      return (await res.json()) as MoMoPaymentResult;
    }

    const reference = `ESAMBA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const idempotencyKey = crypto.randomUUID();

    const rawPayload = {
      planCode: intent.planCode,
      vehicleCount: intent.vehicleCount,
      durationMonths: intent.durationMonths ?? 1,
      phoneNumber: intent.phoneNumber,
      fleetId: intent.fleetId,
      ...(intent.vehicleIds?.length ? { vehicleIds: intent.vehicleIds } : {}),
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
