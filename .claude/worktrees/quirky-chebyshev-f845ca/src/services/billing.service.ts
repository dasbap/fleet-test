import { BillingRepository } from "@/repositories/billing.repository";

export interface BillingSnapshot {
  /** True si un abonnement payant (non-free) existe mais n’est plus dans la fenêtre active. */
  lapsedPaid: boolean;
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

/**
 * Dernière ligne d’abonnement : plan payant non actif (statut ou dates hors fenêtre).
 */
export function computeLapsedPaidFromLatestSubscription(
  latest: {
    status: string;
    starts_at: string;
    ends_at: string;
    plans: { code: string } | null;
  } | null,
  now: Date,
): boolean {
  if (!latest) return false;
  const code = latest.plans?.code ?? "free";
  if (code === "free") return false;
  const ends = new Date(latest.ends_at);
  const starts = new Date(latest.starts_at);
  if (latest.status !== "active") return true;
  if (ends < now) return true;
  if (starts > now) return true;
  return false;
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
