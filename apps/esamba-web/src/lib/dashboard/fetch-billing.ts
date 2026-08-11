import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetContext } from "@/lib/dashboard/session";

export interface BillingOrg {
  id: string;
  name: string;
}

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  pricePerVehicle: number;
  maxVehicles: number | null;
  enablesFinance: boolean;
  enablesAi: boolean;
  enablesReports: boolean;
  enablesDriverScoring: boolean;
}

export interface CurrentSubscription {
  id: string;
  status: string;
  planCode: string;
  planName: string;
  endsAt: string | null;
  trialEndsAt: string | null;
}

export interface PaymentTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerReference: string | null;
  createdAt: string;
}

export interface BillingUsage {
  vehicles: number;
  drivers: number;
  maxVehicles: number;
}

export interface FleetBillingContext {
  planCode: string;
  planName: string;
  billingStatus: string;
  vehicleSlots: number;
  maxVehicles: number;
  subscriptionEndsAt: string | null;
  trialEndsAt: string | null;
}

function planFeatures(plan: BillingPlan): string[] {
  const features = [
    plan.maxVehicles
      ? `${plan.maxVehicles} véhicules max`
      : "Véhicules illimités",
    "Alertes documents",
  ];

  if (plan.enablesReports) features.push("Rapports mensuels");
  if (plan.enablesFinance) features.push("Suivi des dépenses");
  if (plan.enablesAi) features.push("Prédictions maintenance");
  if (plan.enablesDriverScoring) features.push("Score conducteurs");
  if (plan.code === "enterprise") {
    features.push("Support prioritaire", "SLA garanti");
  }

  return features;
}

export { planFeatures };

export async function fetchAbonnementPageData(
  supabase: SupabaseClient,
  context: FleetContext,
) {
  const [
    { data: org },
    { data: billingRaw },
    { data: plansRaw },
    { data: subscription },
    { data: transactionsRaw },
    { count: vehicleCount },
    { count: driverCount },
  ] = await Promise.all([
    supabase
      .from("organisations")
      .select("id, name")
      .eq("id", context.orgId)
      .maybeSingle(),

    supabase.rpc("get_fleet_billing_context", {
      p_fleet_id: context.fleetId,
    }),

    supabase
      .from("plans")
      .select(
        "id, code, name, price_per_vehicle, max_vehicles, enables_finance, enables_ai, enables_reports, enables_driver_scoring",
      )
      .eq("is_active", true)
      .neq("code", "free")
      .order("price_per_vehicle", { ascending: true }),

    supabase
      .from("abonnements")
      .select("id, status, ends_at, trial_ends_at, plans(code, name)")
      .eq("fleet_id", context.fleetId)
      .in("status", [
        "active",
        "trial",
        "grace_period",
        "suspended",
        "pending_payment",
      ])
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("paiements")
      .select(
        "id, amount, currency, status, provider, provider_reference, created_at",
      )
      .eq("org_id", context.orgId)
      .in("status", ["succeeded", "completed", "success"])
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("vehicules")
      .select("id", { count: "exact", head: true })
      .eq("fleet_id", context.fleetId)
      .neq("status", "blocked"),

    supabase
      .from("flotte_adhesions")
      .select("id", { count: "exact", head: true })
      .eq("fleet_id", context.fleetId)
      .eq("is_active", true)
      .eq("role", "driver"),
  ]);

  const billing = (billingRaw ?? {}) as Partial<FleetBillingContext> & {
    vehicle_count?: number;
    max_vehicles?: number;
    vehicle_slots?: number;
    plan_code?: string;
    plan_name?: string;
    billing_status?: string;
    subscription_ends_at?: string | null;
    trial_ends_at?: string | null;
  };

  type PlanEmbed = { code?: string; name?: string };
  const planEmbed = subscription?.plans as
    | PlanEmbed
    | PlanEmbed[]
    | null
    | undefined;
  const embeddedPlan = Array.isArray(planEmbed) ? planEmbed[0] : planEmbed;

  const currentSub: CurrentSubscription | null = subscription
    ? {
        id: subscription.id,
        status: subscription.status,
        planCode: embeddedPlan?.code ?? billing.plan_code ?? "free",
        planName: embeddedPlan?.name ?? billing.plan_name ?? "Gratuit",
        endsAt: subscription.ends_at,
        trialEndsAt: subscription.trial_ends_at,
      }
    : null;

  const plans: BillingPlan[] = (plansRaw ?? []).map((plan) => ({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    pricePerVehicle: plan.price_per_vehicle,
    maxVehicles: plan.max_vehicles,
    enablesFinance: plan.enables_finance,
    enablesAi: plan.enables_ai,
    enablesReports: plan.enables_reports ?? false,
    enablesDriverScoring: plan.enables_driver_scoring ?? false,
  }));

  const transactions: PaymentTransaction[] = (transactionsRaw ?? []).map(
    (tx) => ({
      id: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      provider: tx.provider,
      providerReference: tx.provider_reference,
      createdAt: tx.created_at,
    }),
  );

  const maxVehicles =
    billing.vehicle_slots ?? billing.max_vehicles ?? 3;

  return {
    org: {
      id: org?.id ?? context.orgId,
      name: org?.name ?? "Organisation",
    } satisfies BillingOrg,
    billingContext: {
      planCode: billing.plan_code ?? currentSub?.planCode ?? "free",
      planName: billing.plan_name ?? currentSub?.planName ?? "Gratuit",
      billingStatus: billing.billing_status ?? "trial",
      vehicleSlots: billing.vehicle_slots ?? maxVehicles,
      maxVehicles,
      subscriptionEndsAt:
        billing.subscription_ends_at ?? currentSub?.endsAt ?? null,
      trialEndsAt: billing.trial_ends_at ?? currentSub?.trialEndsAt ?? null,
    } satisfies FleetBillingContext,
    currentSub,
    plans,
    transactions,
    usage: {
      vehicles: vehicleCount ?? billing.vehicle_count ?? 0,
      drivers: driverCount ?? 0,
      maxVehicles,
    } satisfies BillingUsage,
  };
}
