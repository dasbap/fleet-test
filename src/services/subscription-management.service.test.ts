import { beforeEach, describe, expect, it, vi } from "vitest";

import { SubscriptionManagementService } from "./subscription-management.service";

const rpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

describe("SubscriptionManagementService", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("activates an inactive fleet subscription through the dedicated RPC", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: true }, error: null });
    const service = new SubscriptionManagementService();

    await service.activateSubscription("sub-inactive");

    expect(rpc).toHaveBeenCalledWith("activate_fleet_subscription", {
      p_subscription_id: "sub-inactive",
    });
  });
});
