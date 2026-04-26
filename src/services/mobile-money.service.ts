import {
  PaymentTransactionRepository,
  type PaymentProvider,
  type PaymentTransaction,
} from "@/repositories/payment-transaction.repository";

interface StartPaymentInput {
  fleetId: string;
  provider: PaymentProvider;
  amountXaf: number;
  phoneNumber: string;
  merchantCode: string;
}

/**
 * Logique métier Mobile Money (phase P0).
 */
export class MobileMoneyService {
  constructor(private repository: PaymentTransactionRepository) {}

  async startPayment(input: StartPaymentInput): Promise<PaymentTransaction> {
    if (!input.fleetId) {
      throw new Error("La flotte est requise.");
    }

    if (!["orange", "mtn"].includes(input.provider)) {
      throw new Error("Le fournisseur Mobile Money est invalide.");
    }

    if (!Number.isInteger(input.amountXaf) || input.amountXaf <= 0) {
      throw new Error("Le montant doit être un entier strictement positif.");
    }

    if (!input.merchantCode?.trim()) {
      throw new Error("Le code marchand est requis.");
    }

    const sanitizedPhone = input.phoneNumber.replace(/[^\d]/g, "");
    if (sanitizedPhone.length < 9 || sanitizedPhone.length > 15) {
      throw new Error("Le numéro Mobile Money doit contenir entre 9 et 15 chiffres.");
    }

    const reference = `MM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    return this.repository.create({
      reference,
      provider: input.provider,
      amount_xaf: input.amountXaf,
      fleet_id: input.fleetId,
    });
  }

  /**
   * Simulation P0 d'une confirmation provider.
   */
  async confirmPayment(transactionId: string, success = true): Promise<PaymentTransaction> {
    if (!transactionId) {
      throw new Error("La transaction est requise.");
    }
    const status = success ? "completed" : "failed";
    const providerTransactionId = success
      ? `PROV-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
      : null;
    return this.repository.updateStatus(transactionId, status, providerTransactionId);
  }
}
