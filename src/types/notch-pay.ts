/**
 * Types pour l'API Notch Pay.
 * Référence : https://developer.notchpay.co/docs
 */

/** Corps de la requête POST /payments vers l'API Notch Pay. */
export interface NotchPayCreatePaymentRequest {
  amount: number;
  currency: "XAF" | "GHS" | "NGN" | "USD";
  /** Référence unique côté marchand (idempotence). */
  reference: string;
  description: string;
  /** URL de callback post-paiement (redirect utilisateur). */
  callback?: string;
  /** Numéro de téléphone du payeur (optionnel). */
  phone?: string;
  /** Email du payeur (optionnel). */
  email?: string;
  /** Métadonnées libres retournées dans le webhook. */
  metadata?: Record<string, string>;
}

/** Transaction retournée par Notch Pay. */
export interface NotchPayTransaction {
  reference: string;
  amount: number;
  currency: string;
  status: string;
  /** URL de paiement vers laquelle rediriger l'utilisateur. */
  authorization_url?: string;
}

/** Réponse complète de POST /payments. */
export interface NotchPayCreatePaymentResponse {
  code: number;
  status: string;
  message: string;
  transaction: NotchPayTransaction | string;

  /** URL de paiement vers laquelle rediriger l'utilisateur. */

  authorization_url?: string;
}

/** Intent interne E-Samba → Notch Pay. */
export interface NotchPayIntent {
  orgId: string;
  fleetId: string;
  planCode: string;
  vehicleCount: number;
  durationMonths?: number;
  vehicleIds?: string[];
  /** Email du payeur (optionnel). */
  email?: string;
  /** Téléphone du payeur au format international (ex: +237600000000). Optionnel. */
  phone?: string;
}

/** Résultat retourné au frontend après initiation. */
export interface NotchPayInitiateResult {
  /** UUID interne du paiement Supabase. */
  paymentId: string;
  /** Référence Notch Pay (pay_xxx). */
  reference: string;
  /** URL de paiement vers laquelle rediriger l'utilisateur. */
  checkoutUrl: string;
  amountXaf: number;
}
