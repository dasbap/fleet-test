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

  it("requires a positive vehicle count when granting a subscription", async () => {
    const service = new AdminSubscriptionService();

    await expect(
      service.grantSubscription({
        fleetId: "fleet-1",
        planCode: "pro",
        expiresAt: "2026-12-31T23:59:59.000Z",
        permanent: false,
        replaceExisting: true,
        vehicleSlots: 0,
      }),
    ).rejects.toThrow("Choisissez un nombre de vehicules superieur a 0.");

    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects vehicle counts above the selected plan limit before calling the RPC", async () => {
    const service = new AdminSubscriptionService();

    await expect(
      service.grantSubscription({
        fleetId: "fleet-1",
        planCode: "starter",
        expiresAt: "2026-12-31T23:59:59.000Z",
        permanent: false,
        replaceExisting: true,
        vehicleSlots: 26,
        planMaxVehicles: 25,
      }),
    ).rejects.toThrow("Le plan Starter autorise jusqu'a 25 vehicules.");

    expect(rpc).not.toHaveBeenCalled();
  });
});
