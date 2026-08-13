import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentProviderId } from "../env.js";
import { assertVehicleCountWithinPlanLimit } from "./billing/vehicleSlotLimits.js";

export interface BillingCheckoutIntent {
  orgId: string;
  fleetId: string;
  planCode: string;
  vehicleCount: number;
  durationMonths?: number;
  vehicleIds?: string[];
}

export interface BillingCheckoutResult {
  paymentId: string;
  externalRef: string;
  amountXaf: number;
  currency: string;
  status: string;
  provider: PaymentProviderId;
}

interface PlanRow {
  id: string;
  code: string;
  price_per_vehicle: number;
  max_vehicles: number | null;
  is_active: boolean;
}

export async function createBillingCheckoutForUser(
  supabase: SupabaseClient,
  intent: BillingCheckoutIntent,
  paymentProvider: PaymentProviderId,
): Promise<BillingCheckoutResult> {
  const durationMonths = intent.durationMonths ?? 1;
  if (intent.vehicleCount < 1) {
    throw new Error("Au moins un véhicule est requis pour le checkout.");
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, code, price_per_vehicle, max_vehicles, is_active")
    .eq("code", intent.planCode.trim())
    .maybeSingle<PlanRow>();

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
    throw new Error("Montant de checkout invalide.");
  }

  const reference = `ESAMBA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const idempotencyKey = crypto.randomUUID();

  const rawPayload = {
    planCode: intent.planCode,
    vehicleCount: intent.vehicleCount,
    durationMonths,
    fleetId: intent.fleetId,
    checkout: true,
    ...(intent.vehicleIds?.length ? { vehicleIds: intent.vehicleIds } : {}),
  };

  const { data, error } = await supabase
    .from("paiements")
    .insert({
      org_id: intent.orgId,
      provider: paymentProvider,
      amount: amountXaf,
      currency: "XAF",
      status: "pending",
      external_ref: reference,
      idempotency_key: idempotencyKey,
      raw_payload: rawPayload,
    })
    .select("id, status")
    .single();

  if (error) throw new Error(error.message);

  return {
    paymentId: data.id,
    externalRef: reference,
    amountXaf,
    currency: "XAF",
    status: data.status,
    provider: paymentProvider,
  };
}
