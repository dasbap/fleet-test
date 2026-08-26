import type { SupabaseClient } from "@supabase/supabase-js";
import { getNotchApiKey } from "../env.js";
import { createSupabaseServiceClient } from "../infra/supabaseServiceClient.js";
import { assertCanManageBillingForFleet } from "./billing/billingAuthorization.js";
import { runInboundPaymentWebhook } from "./billing/processInboundPaymentWebhook.js";

const NOTCH_PAY_API_URL = "https://api.notchpay.co";

interface PaymentRow {
  id: string;
  external_ref: string;
  status: string;
  raw_payload: unknown;
}

interface NotchRetrievePaymentResponse {
  transaction?: {
    reference?: string;
    status?: string;
  } | null;
}

export interface ReconcileNotchPayInput {
  orgId: string;
  fleetId: string;
  merchantRef: string;
}

export interface ReconcileNotchPayResult {
  paymentStatus: string;
  subscriptionActivated: boolean;
  subscriptionId?: string;
}

export async function reconcileNotchPayPayment(
  userSupabase: SupabaseClient,
  input: ReconcileNotchPayInput,
): Promise<ReconcileNotchPayResult> {
  await assertCanManageBillingForFleet(userSupabase, input);

  const admin = createSupabaseServiceClient();
  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY non configuré.");
  }

  const { data: payment, error: paymentError } = await admin
    .from("paiements")
    .select("id, external_ref, status, raw_payload")
    .eq("provider", "notch")
    .eq("idempotency_key", input.merchantRef)
    .maybeSingle<PaymentRow>();

  if (paymentError) throw new Error(paymentError.message);
  if (!payment) throw new Error("Paiement Notch introuvable.");

  const rawPayload = payment.raw_payload as Record<string, unknown> | null;
  if (rawPayload?.fleetId !== input.fleetId) {
    throw new Error("Le paiement ne correspond pas à cette flotte.");
  }

  if (payment.status === "succeeded") {
    const result = await runInboundPaymentWebhook(admin, payment.external_ref, "complete", "notch");
    return {
      paymentStatus: "succeeded",
      subscriptionActivated: result.subscriptionActivated,
      subscriptionId: result.subscriptionId,
    };
  }

  const apiKey = getNotchApiKey();
  if (!apiKey) throw new Error("NOTCH_PAY_API_KEY non configuré.");

  const response = await fetch(
    `${NOTCH_PAY_API_URL}/payments/${encodeURIComponent(payment.external_ref)}`,
    {
      method: "GET",
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    throw new Error(`Notch Pay API error ${response.status}: ${raw.slice(0, 500)}`);
  }

  const notch = (await response.json()) as NotchRetrievePaymentResponse;
  const providerStatus = notch.transaction?.status?.trim().toLowerCase();
  if (!providerStatus) {
    throw new Error("Notch Pay n'a pas retourné le statut de la transaction.");
  }

  const result = await runInboundPaymentWebhook(
    admin,
    payment.external_ref,
    providerStatus,
    "notch",
  );

  return {
    paymentStatus: result.normalizedStatus,
    subscriptionActivated: result.subscriptionActivated,
    subscriptionId: result.subscriptionId,
  };
}
