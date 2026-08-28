import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AdminSubscriptionService,
  normalizeSubscriptionGrantOptions,
} from "@/services/admin-subscription.service";

const rpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

describe("AdminSubscriptionService", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("normalizes fleets and plans returned by the grant-options RPC", () => {
    const options = normalizeSubscriptionGrantOptions({
      fleets: [{ id: "fleet-1", name: "Douala", org_name: "Org" }],
      plans: [{ code: "starter", name: "Starter", max_vehicles: 25 }],
    });

    expect(options.fleets[0]).toEqual({
      id: "fleet-1",
      name: "Douala",
      orgName: "Org",
    });
    expect(options.plans[0]).toEqual({ code: "starter", name: "Starter", maxVehicles: 25 });
  });

  it("normalizes malformed grant options and filters unusable rows", () => {
    expect(normalizeSubscriptionGrantOptions(null)).toEqual({ fleets: [], plans: [] });
    expect(normalizeSubscriptionGrantOptions([])).toEqual({ fleets: [], plans: [] });

    const options = normalizeSubscriptionGrantOptions({
      fleets: [
        null,
        { id: "", name: "Ignored" },
        { id: "fleet-2", name: "", org_name: 42 },
      ],
      plans: [
        null,
        { code: "", name: "Ignored" },
        { code: "pro", name: "", max_vehicles: Infinity },
        { code: "enterprise", max_vehicles: null },
      ],
    });

    expect(options.fleets).toEqual([
      { id: "fleet-2", name: "Flotte sans nom", orgName: "" },
    ]);
    expect(options.plans).toEqual([
      { code: "pro", name: "pro", maxVehicles: null },
      { code: "enterprise", name: "enterprise", maxVehicles: null },
    ]);
  });

  it("lists normalized grant options through the RPC", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        fleets: [{ id: "fleet-1", name: "Douala", org_name: null }],
        plans: [{ code: "pro", name: "Pro", max_vehicles: 100 }],
      },
      error: null,
    });

    const service = new AdminSubscriptionService();
    await expect(service.listGrantOptions()).resolves.toEqual({
      fleets: [{ id: "fleet-1", name: "Douala", orgName: "" }],
      plans: [{ code: "pro", name: "Pro", maxVehicles: 100 }],
    });
    expect(rpc).toHaveBeenCalledWith("admin_list_subscription_grant_options");
  });

  it.each([
    ["permission_refusee_super_admin_abonnement", "Seul le super admin peut attribuer un abonnement."],
    ["expires_at_required", "Choisissez une date d'expiration ou activez la permanence."],
    ["expires_at_must_be_future", "La date d'expiration doit être dans le futur."],
    ["vehicle_slots_must_be_positive", "Choisissez un nombre de vehicules superieur a 0."],
    ["limite_vehicules_plan_flotte_atteinte", "Ce nombre de vehicules depasse le plafond autorise pour ce plan."],
    ["fleet_not_found", "Flotte introuvable."],
    ["plan_not_found", "Plan introuvable."],
    ["database exploded", "database exploded"],
  ])("maps grant-option RPC error %s", async (message, expected) => {
    rpc.mockResolvedValueOnce({ data: null, error: { message } });
    const service = new AdminSubscriptionService();
    await expect(service.listGrantOptions()).rejects.toThrow(expected);
  });

  it("sends null expires_at when permanence is enabled", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: true, subscription_id: "sub-1" }, error: null });
    const service = new AdminSubscriptionService();

    await service.grantSubscription({
      fleetId: "fleet-1",
      planCode: "pro",
      expiresAt: "2026-12-31T23:59:59.000Z",
      permanent: true,
      replaceExisting: true,
      vehicleSlots: 12,
    });

    expect(rpc).toHaveBeenCalledWith("admin_create_fleet_subscription", {
      p_fleet_id: "fleet-1",
      p_plan_code: "pro",
      p_expires_at: null,
      p_permanent: true,
      p_replace_existing: true,
      p_vehicle_slots: 12,
      p_status: "active",
    });
  });

  it("sends the expiry when permanence is disabled", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: true }, error: null });
    const service = new AdminSubscriptionService();

    await service.grantSubscription({
      fleetId: "fleet-1",
      planCode: "starter",
      expiresAt: "2026-12-31T23:59:59.000Z",
      permanent: false,
      replaceExisting: false,
      vehicleSlots: 1,
      planMaxVehicles: 25,
    });

    expect(rpc).toHaveBeenCalledWith("admin_create_fleet_subscription", expect.objectContaining({
      p_expires_at: "2026-12-31T23:59:59.000Z",
      p_permanent: false,
      p_replace_existing: false,
    }));
  });

  it.each([
    [{ fleetId: "", planCode: "pro" }, "La flotte et le plan sont requis."],
    [{ fleetId: "fleet-1", planCode: "" }, "La flotte et le plan sont requis."],
  ])("requires fleet and plan before granting", async (partial, expected) => {
    const service = new AdminSubscriptionService();
    await expect(service.grantSubscription({
      fleetId: partial.fleetId,
      planCode: partial.planCode,
      expiresAt: "2026-12-31T23:59:59.000Z",
      permanent: false,
      replaceExisting: true,
      vehicleSlots: 1,
    })).rejects.toThrow(expected);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("requires an expiration date for a non-permanent grant", async () => {
    const service = new AdminSubscriptionService();
    await expect(service.grantSubscription({
      fleetId: "fleet-1",
      planCode: "pro",
      expiresAt: null,
      permanent: false,
      replaceExisting: true,
      vehicleSlots: 1,
    })).rejects.toThrow("Choisissez une date d'expiration ou activez la permanence.");
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, Number.NaN])("requires a positive integer vehicle count: %s", async (vehicleSlots) => {
    const service = new AdminSubscriptionService();

    await expect(
      service.grantSubscription({
        fleetId: "fleet-1",
        planCode: "pro",
        expiresAt: "2026-12-31T23:59:59.000Z",
        permanent: false,
        replaceExisting: true,
        vehicleSlots,
      }),
    ).rejects.toThrow("Choisissez un nombre de vehicules superieur a 0.");

    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["starter", "Starter"],
    [" PRO ", "Pro"],
    ["Enterprise", "Enterprise"],
    ["custom", "custom"],
  ])("formats plan %s in capacity errors", async (planCode, planName) => {
    const service = new AdminSubscriptionService();
    await expect(service.grantSubscription({
      fleetId: "fleet-1",
      planCode,
      expiresAt: "2026-12-31T23:59:59.000Z",
      permanent: false,
      replaceExisting: true,
      vehicleSlots: 2,
      planMaxVehicles: 1,
    })).rejects.toThrow(`Le plan ${planName} autorise jusqu'a 1 vehicules.`);
  });

  it("maps grant RPC errors", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "fleet_not_found" } });
    const service = new AdminSubscriptionService();
    await expect(service.grantSubscription({
      fleetId: "fleet-1",
      planCode: "pro",
      expiresAt: null,
      permanent: true,
      replaceExisting: true,
      vehicleSlots: 1,
    })).rejects.toThrow("Flotte introuvable.");
  });
});
