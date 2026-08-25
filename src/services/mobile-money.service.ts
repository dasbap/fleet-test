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

  async startPayment(input: StartMobileMoneyPaymentInput): Promise<PaymentTransaction> {
    if (!this.paymentTxRepository) {
      throw new Error("PaymentTransactionRepository requis pour ce flux.");
    }
    const entropy = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
    const reference = `MM-${Date.now().toString(36).toUpperCase()}-${entropy}`;
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

  async initiatePayment(
    intent: MoMoPaymentIntent,
    options?: MobileMoneyRequestOptions,
  ): Promise<MoMoPaymentResult> {
    if (!options?.accessToken) {
      throw new Error("Jeton d'accès requis pour initier un paiement Mobile Money.");
    }

    const res = await fetch("/api/billing/mobile-money/initiate", {
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
}
