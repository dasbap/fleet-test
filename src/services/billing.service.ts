import { computeLapsedPaidFromLatestSubscription } from "@/lib/billing/computeLapsedPaidFromLatestSubscription";
import { BillingRepository } from "@/repositories/billing.repository";
import type { BillingSnapshot } from "@/types/billing-snapshot";

export type { BillingSnapshot } from "@/types/billing-snapshot";

export { computeLapsedPaidFromLatestSubscription } from "@/lib/billing/computeLapsedPaidFromLatestSubscription";

export interface BillingSnapshotRequestOptions {
  /** Jeton Supabase utilisateur ; requis pour interroger le BFF same-origin. */
  accessToken?: string | null;
}

export class BillingService {
  constructor(private repository: BillingRepository) {}

  async getBillingSnapshot(
    orgId: string,
    fleetId: string,
    options?: BillingSnapshotRequestOptions,
  ): Promise<BillingSnapshot> {
    if (!orgId?.trim()) {
      throw new Error("L'identifiant de l'organisation est requis.");
    }
    if (!fleetId?.trim()) {
      throw new Error("L'identifiant de la flotte est requis.");
    }

    if (options?.accessToken) {
      const url = `/api/billing/subscriptions?org_id=${encodeURIComponent(orgId.trim())}&fleet_id=${encodeURIComponent(fleetId.trim())}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${options.accessToken}`,
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erreur API facturation (${res.status})`);
      }
      return (await res.json()) as BillingSnapshot;
    }

    try {
      const now = new Date();
      const [subscription, latest, recentPayments] = await Promise.all([
        this.repository.findActiveSubscriptionByFleetId(fleetId),
        this.repository.findLatestSubscriptionByFleetId(fleetId),
        this.repository.findLatestPaymentsByOrgId(orgId),
      ]);

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
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (
        message.includes("permission denied") ||
        message.includes("rls") ||
        message.includes("policy")
      ) {
        return {
          lapsedPaid: false,
          subscription: null,
          recentPayments: [],
        };
      }
      throw error;
    }
  }
}
