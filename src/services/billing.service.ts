import { BillingRepository } from "@/repositories/billing.repository";

export interface BillingSnapshot {
  subscription: {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    plan: {
      id: string;
      code: string;
      name: string;
      pricePerVehicle: number;
    } | null;
  } | null;
  recentPayments: Array<{
    id: string;
    provider: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
}

export class BillingService {
  constructor(private repository: BillingRepository) {}

  async getBillingSnapshot(orgId: string, fleetId: string): Promise<BillingSnapshot> {
    if (!orgId?.trim()) {
      throw new Error("L'identifiant de l'organisation est requis.");
    }
    if (!fleetId?.trim()) {
      throw new Error("L'identifiant de la flotte est requis.");
    }

    try {
      const [subscription, recentPayments] = await Promise.all([
        this.repository.findActiveSubscriptionByFleetId(fleetId),
        this.repository.findLatestPaymentsByOrgId(orgId),
      ]);

      return {
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
          subscription: null,
          recentPayments: [],
        };
      }
      throw error;
    }
  }
}
