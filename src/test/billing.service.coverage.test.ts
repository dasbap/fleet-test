import { afterEach, describe, expect, it, vi } from "vitest";
import { BillingService } from "@/services/billing.service";
import type { BillingRepository } from "@/repositories/billing.repository";

function makeRepository() {
  return {
    findActiveSubscriptionByFleetId: vi.fn(),
    findPendingSubscriptionByFleetId: vi.fn(),
    findLatestSubscriptionByFleetId: vi.fn(),
    findLatestPaymentsByOrgId: vi.fn(),
  };
}

function asRepository(repository: ReturnType<typeof makeRepository>): BillingRepository {
  return repository as unknown as BillingRepository;
}

describe("BillingService additional coverage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects a missing fleet id", async () => {
    const service = new BillingService(asRepository(makeRepository()));
    await expect(service.getBillingSnapshot("org-1", "   ")).rejects.toThrow(
      "L'identifiant de la flotte est requis.",
    );
  });

  it("returns an empty direct snapshot when no subscription exists", async () => {
    const repository = makeRepository();
    repository.findActiveSubscriptionByFleetId.mockResolvedValue(null);
    repository.findPendingSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestPaymentsByOrgId.mockResolvedValue([]);

    const service = new BillingService(asRepository(repository));
    await expect(service.getBillingSnapshot("org-1", "fleet-1")).resolves.toEqual({
      lapsedPaid: false,
      subscription: null,
      recentPayments: [],
    });
  });

  it("maps a subscription without a plan", async () => {
    const repository = makeRepository();
    repository.findActiveSubscriptionByFleetId.mockResolvedValue({
      id: "sub-1",
      status: "active",
      starts_at: "2026-01-01T00:00:00.000Z",
      ends_at: null,
      plans: null,
    });
    repository.findPendingSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestPaymentsByOrgId.mockResolvedValue([]);

    const service = new BillingService(asRepository(repository));
    const snapshot = await service.getBillingSnapshot("org-1", "fleet-1");
    expect(snapshot.subscription).toMatchObject({ id: "sub-1", plan: null });
  });

  it.each([
    "permission denied for relation subscriptions",
    "RLS rejected request",
    "row policy blocked access",
  ])("returns an empty snapshot for access-control error: %s", async (message) => {
    const repository = makeRepository();
    repository.findActiveSubscriptionByFleetId.mockRejectedValue(new Error(message));
    repository.findPendingSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestPaymentsByOrgId.mockResolvedValue([]);

    const service = new BillingService(asRepository(repository));
    await expect(service.getBillingSnapshot("org-1", "fleet-1")).resolves.toEqual({
      lapsedPaid: false,
      subscription: null,
      recentPayments: [],
    });
  });

  it("rethrows unrelated direct repository errors", async () => {
    const repository = makeRepository();
    repository.findActiveSubscriptionByFleetId.mockRejectedValue(new Error("network exploded"));
    repository.findPendingSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestPaymentsByOrgId.mockResolvedValue([]);

    const service = new BillingService(asRepository(repository));
    await expect(service.getBillingSnapshot("org-1", "fleet-1")).rejects.toThrow("network exploded");
  });

  it("reads a JSON billing snapshot from the authenticated BFF", async () => {
    const snapshot = {
      lapsedPaid: false,
      subscription: null,
      recentPayments: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(snapshot), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const repository = makeRepository();
    const service = new BillingService(asRepository(repository));
    await expect(
      service.getBillingSnapshot(" org/1 ", " fleet 1 ", { accessToken: "token-1" }),
    ).resolves.toEqual(snapshot);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/billing/subscriptions?org_id=org%2F1&fleet_id=fleet%201",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer token-1",
        },
      },
    );
    expect(repository.findActiveSubscriptionByFleetId).not.toHaveBeenCalled();
  });

  it("detects an HTML response from the billing API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<!DOCTYPE html><html></html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    );

    const repository = makeRepository();
    repository.findActiveSubscriptionByFleetId.mockRejectedValue(new Error("fallback reached"));
    repository.findPendingSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestPaymentsByOrgId.mockResolvedValue([]);
    const service = new BillingService(asRepository(repository));

    await expect(
      service.getBillingSnapshot("org-1", "fleet-1", { accessToken: "token" }),
    ).rejects.toThrow();
  });

  it("detects a non-JSON API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("proxy unavailable", {
          status: 502,
          headers: { "Content-Type": "text/plain" },
        }),
      ),
    );

    const repository = makeRepository();
    repository.findActiveSubscriptionByFleetId.mockRejectedValue(new Error("fallback reached"));
    repository.findPendingSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestPaymentsByOrgId.mockResolvedValue([]);
    const service = new BillingService(asRepository(repository));

    await expect(
      service.getBillingSnapshot("org-1", "fleet-1", { accessToken: "token" }),
    ).rejects.toThrow();
  });

  it("detects invalid JSON from a successful billing API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("{", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const repository = makeRepository();
    repository.findActiveSubscriptionByFleetId.mockRejectedValue(new Error("fallback reached"));
    repository.findPendingSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestPaymentsByOrgId.mockResolvedValue([]);
    const service = new BillingService(asRepository(repository));

    await expect(
      service.getBillingSnapshot("org-1", "fleet-1", { accessToken: "token" }),
    ).rejects.toThrow();
  });

  it("uses an API error body when the BFF returns a failing status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("billing denied", {
          status: 403,
          headers: { "Content-Type": "text/plain" },
        }),
      ),
    );

    const repository = makeRepository();
    repository.findActiveSubscriptionByFleetId.mockRejectedValue(new Error("fallback reached"));
    repository.findPendingSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestPaymentsByOrgId.mockResolvedValue([]);
    const service = new BillingService(asRepository(repository));

    await expect(
      service.getBillingSnapshot("org-1", "fleet-1", { accessToken: "token" }),
    ).rejects.toThrow();
  });
});
