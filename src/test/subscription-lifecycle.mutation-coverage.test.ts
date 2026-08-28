import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SUBSCRIPTION_ACCESS,
  activateSubscriptionAfterPayment,
  cancelSubscription,
  enterGracePeriod,
  getAccessRule,
  initiateSubscriptionPayment,
  startTrial,
  suspendExpiredSubscriptions,
} from "@/server/domain/billing/subscriptionLifecycle";

describe("subscription lifecycle mutation coverage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("defines exact access rules for every subscription status", () => {
    expect(SUBSCRIPTION_ACCESS.trial).toEqual({ maxVehicles: 3, canAddVehicles: true, premiumFeatures: false, terrainAccess: true, isReadOnly: false, needsUpgrade: false, message: expect.stringContaining("essai gratuite"), severity: "info" });
    expect(SUBSCRIPTION_ACCESS.pending_payment).toEqual({ maxVehicles: 3, canAddVehicles: false, premiumFeatures: false, terrainAccess: true, isReadOnly: false, needsUpgrade: false, message: expect.stringContaining("Paiement en cours"), severity: "info" });
    expect(SUBSCRIPTION_ACCESS.active).toEqual({ maxVehicles: Infinity, canAddVehicles: true, premiumFeatures: true, terrainAccess: true, isReadOnly: false, needsUpgrade: false, message: "", severity: "info" });
    expect(SUBSCRIPTION_ACCESS.grace_period).toEqual({ maxVehicles: Infinity, canAddVehicles: false, premiumFeatures: false, terrainAccess: true, isReadOnly: false, needsUpgrade: true, message: expect.stringContaining("Accès terrain maintenu"), severity: "warning" });
    expect(SUBSCRIPTION_ACCESS.suspended).toEqual({ maxVehicles: 0, canAddVehicles: false, premiumFeatures: false, terrainAccess: false, isReadOnly: true, needsUpgrade: true, message: expect.stringContaining("Flotte suspendue"), severity: "error" });
    expect(SUBSCRIPTION_ACCESS.expired).toEqual({ maxVehicles: 0, canAddVehicles: false, premiumFeatures: false, terrainAccess: false, isReadOnly: true, needsUpgrade: true, message: expect.stringContaining("Abonnement terminé"), severity: "error" });
    expect(SUBSCRIPTION_ACCESS.cancelled).toEqual({ maxVehicles: 0, canAddVehicles: false, premiumFeatures: false, terrainAccess: false, isReadOnly: true, needsUpgrade: true, message: expect.stringContaining("Abonnement résilié"), severity: "muted" });
    for (const status of ["trial", "pending_payment", "active", "grace_period", "suspended", "expired", "cancelled"] as const) {
      expect(getAccessRule(status)).toBe(SUBSCRIPTION_ACCESS[status]);
    }
    expect(getAccessRule("unknown" as any)).toBe(SUBSCRIPTION_ACCESS.suspended);
  });

  it("starts trial with defaults and propagates RPC errors", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: "sub-1", error: null }).mockResolvedValueOnce({ data: null, error: { message: "rpc fail" } });
    const admin = { rpc } as any;
    await expect(startTrial(admin, "fleet-1")).resolves.toBe("sub-1");
    expect(rpc).toHaveBeenCalledWith("billing_start_trial", { p_fleet_id: "fleet-1", p_trial_days: 30 });
    await expect(startTrial(admin, "fleet-2", 14)).rejects.toThrow("rpc fail");
    expect(rpc).toHaveBeenLastCalledWith("billing_start_trial", { p_fleet_id: "fleet-2", p_trial_days: 14 });
  });

  it("enters grace, suspends and cancels with exact RPC payloads", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { to_grace: 2, to_suspend: 3, to_expire: 4 }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const admin = { rpc } as any;
    await enterGracePeriod(admin, "s1");
    expect(rpc).toHaveBeenNthCalledWith(1, "billing_enter_grace_period", { p_subscription_id: "s1", p_grace_days: 7 });
    await expect(suspendExpiredSubscriptions(admin)).resolves.toEqual({ to_grace: 2, to_suspend: 3, to_expire: 4 });
    await cancelSubscription(admin, "s2", "u1");
    expect(rpc).toHaveBeenNthCalledWith(3, "billing_cancel_subscription", { p_subscription_id: "s2", p_cancelled_by: "u1" });
    await cancelSubscription(admin, "s3");
    expect(rpc).toHaveBeenNthCalledWith(4, "billing_cancel_subscription", { p_subscription_id: "s3", p_cancelled_by: null });
  });

  it("propagates lifecycle RPC errors", async () => {
    const admin = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }) } as any;
    await expect(enterGracePeriod(admin, "s", 3)).rejects.toThrow("boom");
    await expect(suspendExpiredSubscriptions(admin)).rejects.toThrow("boom");
    await expect(cancelSubscription(admin, "s")).rejects.toThrow("boom");
  });

  it("activates only eligible subscription statuses", async () => {
    const inMock = vi.fn().mockResolvedValue({ error: null });
    const eqMock = vi.fn().mockReturnValue({ in: inMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    const from = vi.fn().mockReturnValue({ update: updateMock });
    await activateSubscriptionAfterPayment({ from } as any, "sub-1");
    expect(from).toHaveBeenCalledWith("abonnements");
    expect(updateMock).toHaveBeenCalledWith({ status: "active" });
    expect(eqMock).toHaveBeenCalledWith("id", "sub-1");
    expect(inMock).toHaveBeenCalledWith("status", ["pending_payment", "trial", "grace_period"]);
    inMock.mockResolvedValueOnce({ error: { message: "update fail" } });
    await expect(activateSubscriptionAfterPayment({ from } as any, "sub-2")).rejects.toThrow("update fail");
  });

  function makeAdmin(options?: { existing?: { id: string; status: string } | null; plan?: any; planError?: any; subError?: any; payError?: any; updateError?: any; insertSubError?: any }) {
    const plan = options?.plan === undefined ? { id: "plan-1", price_per_vehicle: 1000, max_vehicles: 4 } : options.plan;
    const existing = options?.existing === undefined ? { id: "sub-existing", status: "trial" } : options.existing;
    const payment = { id: "pay-1" };
    const planSingle = vi.fn().mockResolvedValue({ data: plan, error: options?.planError ?? null });
    const subSingle = vi.fn().mockResolvedValue({ data: existing, error: options?.subError ?? null });
    const paymentSingle = vi.fn().mockResolvedValue({ data: payment, error: options?.payError ?? null });
    const newSubSingle = vi.fn().mockResolvedValue({ data: { id: "sub-new" }, error: options?.insertSubError ?? null });
    const updateEq = vi.fn().mockResolvedValue({ error: options?.updateError ?? null });
    const planChain: any = { select: vi.fn(() => planChain), eq: vi.fn(() => planChain), maybeSingle: planSingle };
    const subChain: any = { select: vi.fn(() => subChain), eq: vi.fn(() => subChain), in: vi.fn(() => subChain), order: vi.fn(() => subChain), limit: vi.fn(() => subChain), maybeSingle: subSingle, update: vi.fn(() => ({ eq: updateEq })), insert: vi.fn(() => ({ select: vi.fn(() => ({ single: newSubSingle })) })) };
    const payChain: any = { insert: vi.fn(() => ({ select: vi.fn(() => ({ single: paymentSingle })) })) };
    const from = vi.fn((table: string) => table === "plans" ? planChain : table === "paiements" ? payChain : subChain);
    return { admin: { from } as any, from, planChain, subChain, payChain, updateEq, newSubSingle, paymentSingle };
  }

  it("initiates payment by updating an existing subscription", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("uuid-1");
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    const { admin, payChain, subChain, updateEq } = makeAdmin();
    await expect(initiateSubscriptionPayment(admin, "fleet-1", "pro", 6)).resolves.toEqual({ subscriptionId: "sub-existing", paymentId: "pay-1" });
    expect(payChain.insert).toHaveBeenCalledWith(expect.objectContaining({ org_id: "fleet-1", provider: "notch", amount: 0, currency: "XAF", status: "initiated", idempotency_key: "uuid-1", raw_payload: { planCode: "pro", fleetId: "fleet-1", durationMonths: 6, vehicleCount: 4 } }));
    expect(subChain.update).toHaveBeenCalledWith({ status: "pending_payment" });
    expect(updateEq).toHaveBeenCalledWith("id", "sub-existing");
  });

  it("initiates payment by creating a new subscription with minimum slots", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));
    vi.spyOn(crypto, "randomUUID").mockReturnValue("uuid-2");
    const { admin, subChain } = makeAdmin({ existing: null, plan: { id: "plan-2", price_per_vehicle: 0, max_vehicles: 0 } });
    await expect(initiateSubscriptionPayment(admin, "fleet-2", "starter")).resolves.toEqual({ subscriptionId: "sub-new", paymentId: "pay-1" });
    expect(subChain.insert).toHaveBeenCalledWith(expect.objectContaining({ fleet_id: "fleet-2", plan_id: "plan-2", payment_id: "pay-1", status: "pending_payment", vehicle_slots: 1 }));
    const inserted = subChain.insert.mock.calls[0][0];
    expect(inserted.starts_at).toBe("2026-01-15T00:00:00.000Z");
    expect(inserted.ends_at).toBe("2026-02-15T00:00:00.000Z");
    vi.useRealTimers();
  });

  it("fails initiation for missing plan and every database error stage", async () => {
    await expect(initiateSubscriptionPayment(makeAdmin({ plan: null }).admin, "f", "missing")).rejects.toThrow("Plan introuvable : missing");
    await expect(initiateSubscriptionPayment(makeAdmin({ planError: { message: "plan error" } }).admin, "f", "p")).rejects.toThrow("plan error");
    await expect(initiateSubscriptionPayment(makeAdmin({ subError: { message: "sub error" } }).admin, "f", "p")).rejects.toThrow("sub error");
    await expect(initiateSubscriptionPayment(makeAdmin({ payError: { message: "pay error" } }).admin, "f", "p")).rejects.toThrow("pay error");
    await expect(initiateSubscriptionPayment(makeAdmin({ updateError: { message: "update error" } }).admin, "f", "p")).rejects.toThrow("update error");
    await expect(initiateSubscriptionPayment(makeAdmin({ existing: null, insertSubError: { message: "insert error" } }).admin, "f", "p")).rejects.toThrow("insert error");
  });
});
