import type { SupabaseClient } from "@supabase/supabase-js";
import { computeLapsedPaidFromLatestSubscription } from "../../lib/billing/computeLapsedPaidFromLatestSubscription.js";
import type { BillingSnapshot } from "../../types/billing-snapshot.js";

interface SubscriptionRow {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  plan_id: string;
  plans: {
    id: string;
    code: string;
    name: string;
    price_per_vehicle: number;
  } | null;
}

interface PaymentRow {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export async function loadBillingSnapshotForUser(
  supabase: SupabaseClient,
  orgId: string,
  fleetId: string,
): Promise<BillingSnapshot> {
  const nowIso = new Date().toISOString();
  const now = new Date();

  const [subActive, subLatest, paymentsRes] = await Promise.all([
    supabase
      .from("abonnements")
      .select("id, status, starts_at, ends_at, plan_id, plans(id, code, name, price_per_vehicle)")
      .eq("fleet_id", fleetId)
      .eq("status", "active")
      .lte("starts_at", nowIso)
      .gte("ends_at", nowIso)
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle<SubscriptionRow>(),
    supabase
      .from("abonnements")
      .select("id, status, starts_at, ends_at, plan_id, plans(id, code, name, price_per_vehicle)")
      .eq("fleet_id", fleetId)
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle<SubscriptionRow>(),
    supabase
      .from("paiements")
      .select("id, provider, amount, currency, status, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<PaymentRow[]>(),
  ]);

  if (subActive.error) throw new Error(subActive.error.message);
  if (subLatest.error) throw new Error(subLatest.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);

  const subscription = subActive.data ?? null;
  const latest = subLatest.data ?? null;
  const recentPayments = paymentsRes.data ?? [];

  const lapsedPaid = computeLapsedPaidFromLatestSubscription(latest, now);

  return {
    lapsedPaid,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          startsAt: subscription.starts_at,
          endsAt: subscription.ends_at,
          plan: subscription.plans
            ? {
                id: subscription.plans.id,
                code: subscription.plans.code,
                name: subscription.plans.name,
                pricePerVehicle: subscription.plans.price_per_vehicle,
              }
            : null,
        }
      : null,
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.created_at,
    })),
  };
}
