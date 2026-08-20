import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentProviderId } from "../env.js";
import { assertCanManageBillingForFleet } from "./billing/billingAuthorization.js";
import { createServerOwnedPaymentIntent } from "./billing/paymentIntent.js";
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

export async function createBillingCheckoutForUser(
  supabase: SupabaseClient,
  intent: BillingCheckoutIntent,
  paymentProvider: PaymentProviderId,
): Promise<BillingCheckoutResult> {
  const durationMonths = intent.durationMonths ?? 1;
  await assertCanManageBillingForFleet(supabase, intent);

  if (intent.vehicleCount < 1) {
    throw new Error("Au moins un véhicule est requis pour le checkout.");
  }
  assertSelectedVehiclesMatchChargedCount(intent.vehicleIds, intent.vehicleCount);

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

  const referenceEntropy = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  const reference = `ESAMBA-${Date.now().toString(36).toUpperCase()}-${referenceEntropy}`;
  const idempotencyKey = crypto.randomUUID();

  const payment = await createServerOwnedPaymentIntent(supabase, {
    orgId: intent.orgId,
    fleetId: intent.fleetId,
    planCode: plan.code,
    vehicleCount: intent.vehicleCount,
    durationMonths,
    provider: paymentProvider,
    externalRef: reference,
    idempotencyKey,
    expectedAmountXaf: amountXaf,
    vehicleIds: intent.vehicleIds,
    checkout: true,
  });

  return {
    paymentId: payment.paymentId,
    externalRef: reference,
    amountXaf: payment.amountXaf,
    currency: payment.currency,
    status: payment.status,
    provider: paymentProvider,
  };
}
