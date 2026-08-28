import { computeLapsedPaidFromLatestSubscription } from "@/lib/billing/computeLapsedPaidFromLatestSubscription";
import { BillingRepository } from "@/repositories/billing.repository";
import type { BillingSnapshot } from "@/types/billing-snapshot";

export type { BillingSnapshot } from "@/types/billing-snapshot";

export { computeLapsedPaidFromLatestSubscription } from "@/lib/billing/computeLapsedPaidFromLatestSubscription";

export interface BillingSnapshotRequestOptions {
  /** Jeton Supabase utilisateur ; requis pour interroger le BFF same-origin. */
  accessToken?: string | null;
}

async function readBillingSnapshotJson(res: Response): Promise<BillingSnapshot> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    const text = await res.text().catch(() => "");
    const trimmed = text.trimStart();
    if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
      throw new Error(
        "La route API facturation a renvoye du HTML. Verifiez que le deploiement Vercel courant expose bien /api/billing/subscriptions et que Deployment Protection est contournee pour ce domaine.",
      );
    }
    throw new Error(
      `La route API facturation a renvoye une reponse non JSON (${res.status}).`,
    );
  }

  try {
    return (await res.json()) as BillingSnapshot;
  } catch {
    throw new Error("La route API facturation a renvoye un JSON invalide.");
  }
}

export class BillingService {
  constructor(private repository: BillingRepository) {}

  private async getDirectBillingSnapshot(orgId: string, fleetId: string): Promise<BillingSnapshot> {
    try {
      const now = new Date();
      const [activeSubscription, pendingSubscription, latest, recentPayments] = await Promise.all([
        this.repository.findActiveSubscriptionByFleetId(fleetId),
        this.repository.findPendingSubscriptionByFleetId(fleetId),
        this.repository.findLatestSubscriptionByFleetId(fleetId),
        this.repository.findLatestPaymentsByOrgId(orgId),
      ]);

      const subscription = activeSubscription ?? pendingSubscription;
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
      try {
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
        return await readBillingSnapshotJson(res);
      } catch (error) {
        const isLocalDev =
          import.meta.env.DEV &&
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
        if (!isLocalDev) throw error;

        console.warn(
          "[billing] BFF local indisponible, lecture Supabase directe avec RLS utilisateur.",
          error,
        );
        return this.getDirectBillingSnapshot(orgId, fleetId);
      }
    }

    return this.getDirectBillingSnapshot(orgId, fleetId);
  }
}
