import { vi } from "vitest";

vi.mock("@/repositories/billing.repository", () => ({
  BillingRepository: class BillingRepository {
    findActiveSubscriptionByFleetId = vi.fn();
    findLatestSubscriptionByFleetId = vi.fn();
    findLatestPaymentsByOrgId = vi.fn();
  },
}));

import { describe, expect, it } from "vitest";
import {
  BillingService,
  computeLapsedPaidFromLatestSubscription,
} from "@/services/billing.service";
import { BillingRepository } from "@/repositories/billing.repository";

const activeProRow = {
  id: "sub-1",
  status: "active",
  starts_at: "2026-01-01T00:00:00.000Z",
  ends_at: "2026-12-31T00:00:00.000Z",
  plan_id: "plan-1",
  plans: {
    id: "plan-1",
    code: "pro",
    name: "Pro",
    price_per_vehicle: 5000,
  },
};

describe("computeLapsedPaidFromLatestSubscription", () => {
  const now = new Date("2026-06-01T00:00:00.000Z");

  it("false sans ligne", () => {
    expect(computeLapsedPaidFromLatestSubscription(null, now)).toBe(false);
  });

  it("false si plan free", () => {
    expect(
      computeLapsedPaidFromLatestSubscription(
        {
          status: "expired",
          starts_at: "2025-01-01T00:00:00.000Z",
          ends_at: "2025-12-01T00:00:00.000Z",
          plans: { code: "free" },
        },
        now,
      ),
    ).toBe(false);
  });

  it("true si plan payant et statut non actif", () => {
    expect(
      computeLapsedPaidFromLatestSubscription(
        {
          status: "expired",
          starts_at: "2025-01-01T00:00:00.000Z",
          ends_at: "2026-12-31T00:00:00.000Z",
          plans: { code: "starter" },
        },
        now,
      ),
    ).toBe(true);
  });

  it("true si plan payant et ends_at passé", () => {
    expect(
      computeLapsedPaidFromLatestSubscription(
        {
          status: "active",
          starts_at: "2025-01-01T00:00:00.000Z",
          ends_at: "2026-03-01T00:00:00.000Z",
          plans: { code: "pro" },
        },
        now,
      ),
    ).toBe(true);
  });
});

describe("BillingService", () => {
  it("mappe correctement le snapshot billing", async () => {
    const repository = new BillingRepository();
    repository.findActiveSubscriptionByFleetId.mockResolvedValue(activeProRow);
    repository.findLatestSubscriptionByFleetId.mockResolvedValue(activeProRow);
    repository.findLatestPaymentsByOrgId.mockResolvedValue([
      {
        id: "pay-1",
        provider: "momo",
        amount: 12000,
        currency: "XAF",
        status: "succeeded",
        created_at: "2026-04-15T10:00:00.000Z",
      },
    ]);

    const service = new BillingService(repository);
    const snapshot = await service.getBillingSnapshot("org-1", "fleet-1");

    expect(snapshot.lapsedPaid).toBe(false);
    expect(snapshot.subscription?.plan?.name).toBe("Pro");
    expect(snapshot.recentPayments[0].provider).toBe("momo");
  });

  it("rejette les paramètres manquants", async () => {
    const service = new BillingService(new BillingRepository());
    await expect(service.getBillingSnapshot("", "fleet-1")).rejects.toThrow(
      "L'identifiant de l'organisation est requis.",
    );
  });

  it("retourne un snapshot vide si RLS refuse l'accès billing", async () => {
    const repository = new BillingRepository();
    repository.findActiveSubscriptionByFleetId.mockRejectedValue(
      new Error("permission denied for table paiements"),
    );
    repository.findLatestSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestPaymentsByOrgId.mockResolvedValue([]);

    const service = new BillingService(repository);
    const snapshot = await service.getBillingSnapshot("org-1", "fleet-1");

    expect(snapshot).toEqual({
      lapsedPaid: false,
      subscription: null,
      recentPayments: [],
    });
  });
});
