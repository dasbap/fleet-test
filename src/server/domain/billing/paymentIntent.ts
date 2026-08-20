import type { SupabaseClient } from "@supabase/supabase-js";

export interface ServerOwnedPaymentIntentInput {
  orgId: string;
  fleetId: string;
  planCode: string;
  vehicleCount: number;
  durationMonths: number;
  provider: string;
  externalRef: string;
  idempotencyKey: string;
  expectedAmountXaf: number;
  vehicleIds?: string[];
  phoneNumber?: string;
  checkout?: boolean;
}

export interface ServerOwnedPaymentIntentResult {
  paymentId: string;
  status: string;
  amountXaf: number;
  currency: string;
}

export async function createServerOwnedPaymentIntent(
  supabase: SupabaseClient,
  input: ServerOwnedPaymentIntentInput,
): Promise<ServerOwnedPaymentIntentResult> {
  const { data, error } = await supabase.rpc("create_payment_intent", {
    p_org_id: input.orgId,
    p_fleet_id: input.fleetId,
    p_plan_code: input.planCode,
    p_vehicle_count: input.vehicleCount,
    p_duration_months: input.durationMonths,
    p_provider: input.provider,
    p_external_ref: input.externalRef,
    p_idempotency_key: input.idempotencyKey,
    p_expected_amount: input.expectedAmountXaf,
    p_vehicle_ids: input.vehicleIds ?? null,
    p_phone_number: input.phoneNumber ?? null,
    p_checkout: input.checkout === true,
  });

  if (error) throw new Error(error.message);

  const payload = data as {
    payment_id?: string;
    status?: string;
    amount_xaf?: number;
    currency?: string;
  } | null;

  if (!payload?.payment_id || !payload.status || payload.amount_xaf == null || !payload.currency) {
    throw new Error("Réponse de création de paiement invalide.");
  }

  return {
    paymentId: payload.payment_id,
    status: payload.status,
    amountXaf: Number(payload.amount_xaf),
    currency: payload.currency,
  };
}
