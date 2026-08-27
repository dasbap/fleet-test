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

  it("rethrows a non-Error direct repository rejection", async () => {
    const repository = makeRepository();
    repository.findActiveSubscriptionByFleetId.mockRejectedValue("repository rejected");
    repository.findPendingSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestSubscriptionByFleetId.mockResolvedValue(null);
    repository.findLatestPaymentsByOrgId.mockResolvedValue([]);

    const service = new BillingService(asRepository(repository));
    await expect(service.getBillingSnapshot("org-1", "fleet-1")).rejects.toBe("repository rejected");
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

    const service = new BillingService(asRepository(makeRepository()));
    await expect(
      service.getBillingSnapshot("org-1", "fleet-1", { accessToken: "token" }),
    ).rejects.toThrow("La route API facturation a renvoye du HTML");
  });

  it("detects an html tag even without a doctype", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("   <html><body>protected</body></html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    );

    const service = new BillingService(asRepository(makeRepository()));
    await expect(
      service.getBillingSnapshot("org-1", "fleet-1", { accessToken: "token" }),
    ).rejects.toThrow("La route API facturation a renvoye du HTML");
  });

  it("detects a non-JSON API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("proxy unavailable", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        }),
      ),
    );

    const service = new BillingService(asRepository(makeRepository()));
    await expect(
      service.getBillingSnapshot("org-1", "fleet-1", { accessToken: "token" }),
    ).rejects.toThrow("La route API facturation a renvoye une reponse non JSON (200).");
  });

  it("handles a successful response without a content-type header", async () => {
    const response = {
      ok: true,
      status: 200,
      headers: { get: vi.fn().mockReturnValue(null) },
      text: vi.fn().mockResolvedValue("plain response"),
    } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const service = new BillingService(asRepository(makeRepository()));
    await expect(
      service.getBillingSnapshot("org-1", "fleet-1", { accessToken: "token" }),
    ).rejects.toThrow("La route API facturation a renvoye une reponse non JSON (200).");
  });

  it("handles a non-JSON response whose text body cannot be read", async () => {
    const response = {
      ok: true,
      status: 502,
      headers: { get: vi.fn().mockReturnValue("text/plain") },
      text: vi.fn().mockRejectedValue(new Error("body unavailable")),
    } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const service = new BillingService(asRepository(makeRepository()));
    await expect(
      service.getBillingSnapshot("org-1", "fleet-1", { accessToken: "token" }),
    ).rejects.toThrow("La route API facturation a renvoye une reponse non JSON (502).");
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

    const service = new BillingService(asRepository(makeRepository()));
    await expect(
      service.getBillingSnapshot("org-1", "fleet-1", { accessToken: "token" }),
    ).rejects.toThrow("La route API facturation a renvoye un JSON invalide.");
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

    const service = new BillingService(asRepository(makeRepository()));
    await expect(
      service.getBillingSnapshot("org-1", "fleet-1", { accessToken: "token" }),
    ).rejects.toThrow("billing denied");
  });

  it("uses the HTTP status when a failing BFF response has an empty body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 503 })),
    );

    const service = new BillingService(asRepository(makeRepository()));
    await expect(
      service.getBillingSnapshot("org-1", "fleet-1", { accessToken: "token" }),
    ).rejects.toThrow("Erreur API facturation (503)");
  });

  it("uses the HTTP status when a failing BFF body cannot be read", async () => {
    const response = {
      ok: false,
      status: 504,
      text: vi.fn().mockRejectedValue(new Error("body unavailable")),
    } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const service = new BillingService(asRepository(makeRepository()));
    await expect(
      service.getBillingSnapshot("org-1", "fleet-1", { accessToken: "token" }),
    ).rejects.toThrow("Erreur API facturation (504)");
  });
});
