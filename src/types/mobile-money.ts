export type MoMoProvider = "orange_money" | "mtn_momo";

export interface MoMoPaymentIntent {
  orgId: string;
  fleetId: string;
  provider: MoMoProvider;
  phoneNumber: string;
  amountXaf: number;
  planCode: string;
  vehicleCount: number;
  /** Identifiants véhicules couverts (sinon prise des N premiers de la flotte côté webhook). */
  vehicleIds?: string[];
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
