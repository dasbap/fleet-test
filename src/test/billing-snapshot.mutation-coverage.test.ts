import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadBillingSnapshotForUser } from "@/server/domain/billingSnapshot";

function makeMaybeSingle(result: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

function makeReturns(result: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    returns: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

function makeClient(results?: { active?: any; pending?: any; latest?: any; payments?: any }) {
  const active = makeMaybeSingle(results?.active ?? { data: null, error: null });
  const pending = makeMaybeSingle(results?.pending ?? { data: null, error: null });
  const latest = makeMaybeSingle(results?.latest ?? { data: null, error: null });
  const payments = makeReturns(results?.payments ?? { data: [], error: null });
  let subIndex = 0;
  const from = vi.fn((table: string) => {
    if (table === "paiements") return payments;
    return [active, pending, latest][subIndex++];
  });
  return { client: { from } as any, active, pending, latest, payments, from };
}

describe("billing snapshot mutation coverage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });

  it("returns an empty healthy snapshot", async () => {
    const { client, from, active, pending, latest, payments } = makeClient();
    await expect(loadBillingSnapshotForUser(client, "org-1", "fleet-1")).resolves.toEqual({ lapsedPaid: false, subscription: null, recentPayments: [] });
    expect(from).toHaveBeenCalledTimes(4);
    expect(active.eq).toHaveBeenCalledWith("fleet_id", "fleet-1");
    expect(active.eq).toHaveBeenCalledWith("status", "active");
    expect(active.lte).toHaveBeenCalledWith("starts_at", "2026-06-15T12:00:00.000Z");
    expect(active.gte).toHaveBeenCalledWith("ends_at", "2026-06-15T12:00:00.000Z");
    expect(pending.in).toHaveBeenCalledWith("status", ["inactive", "pending_payment"]);
    expect(latest.order).toHaveBeenCalledWith("ends_at", { ascending: false });
    expect(payments.eq).toHaveBeenCalledWith("org_id", "org-1");
    expect(payments.limit).toHaveBeenCalledWith(5);
  });

  it("prefers active subscription and maps plan and payments", async () => {
    const subscription = { id: "s1", status: "active", starts_at: "2026-01-01", ends_at: "2027-01-01", plan_id: "p1", plans: { id: "p1", code: "pro", name: "Pro", price_per_vehicle: 2000 } };
    const payment = { id: "pay1", provider: "notch", amount: 4000, currency: "XAF", status: "completed", created_at: "2026-06-01" };
    const { client } = makeClient({ active: { data: subscription, error: null }, pending: { data: { ...subscription, id: "pending" }, error: null }, latest: { data: subscription, error: null }, payments: { data: [payment], error: null } });
    await expect(loadBillingSnapshotForUser(client, "org", "fleet")).resolves.toEqual({
      lapsedPaid: false,
      subscription: { id: "s1", status: "active", startsAt: "2026-01-01", endsAt: "2027-01-01", plan: { id: "p1", code: "pro", name: "Pro", pricePerVehicle: 2000 } },
      recentPayments: [{ id: "pay1", provider: "notch", amount: 4000, currency: "XAF", status: "completed", createdAt: "2026-06-01" }],
    });
  });

  it("falls back to pending subscription and maps missing plan", async () => {
    const pending = { id: "s2", status: "pending_payment", starts_at: "2026-06-01", ends_at: "2026-07-01", plan_id: "p2", plans: null };
    const { client } = makeClient({ pending: { data: pending, error: null }, latest: { data: pending, error: null }, payments: { data: null, error: null } });
    const result = await loadBillingSnapshotForUser(client, "org", "fleet");
    expect(result.subscription).toEqual({ id: "s2", status: "pending_payment", startsAt: "2026-06-01", endsAt: "2026-07-01", plan: null });
    expect(result.recentPayments).toEqual([]);
  });

  it("flags lapsed paid latest subscription", async () => {
    const latest = { id: "old", status: "active", starts_at: "2026-01-01T00:00:00Z", ends_at: "2026-05-01T00:00:00Z", plan_id: "p", plans: { id: "p", code: "pro", name: "Pro", price_per_vehicle: 1 } };
    const { client } = makeClient({ latest: { data: latest, error: null } });
    const result = await loadBillingSnapshotForUser(client, "org", "fleet");
    expect(result.lapsedPaid).toBe(true);
    expect(result.subscription).toBeNull();
  });

  it("propagates every query error in order", async () => {
    await expect(loadBillingSnapshotForUser(makeClient({ active: { data: null, error: { message: "active error" } } }).client, "o", "f")).rejects.toThrow("active error");
    await expect(loadBillingSnapshotForUser(makeClient({ pending: { data: null, error: { message: "pending error" } } }).client, "o", "f")).rejects.toThrow("pending error");
    await expect(loadBillingSnapshotForUser(makeClient({ latest: { data: null, error: { message: "latest error" } } }).client, "o", "f")).rejects.toThrow("latest error");
    await expect(loadBillingSnapshotForUser(makeClient({ payments: { data: null, error: { message: "payments error" } } }).client, "o", "f")).rejects.toThrow("payments error");
  });
});
