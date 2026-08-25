/** @vitest-environment node */
import { describe, expect, it, vi } from "vitest";
import { createBillingCheckoutForUser } from "@/server/domain/billingCheckout";

describe("createBillingCheckoutForUser plan limits", () => {
  it("rejects checkout vehicleCount above the plan max_vehicles", async () => {
    const insert = vi.fn();
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: { allowed: true }, error: null }),
      from: vi.fn((table: string) => {
        if (table === "flottes") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "00000000-0000-4000-8000-000000000002",
                      org_id: "00000000-0000-4000-8000-000000000001",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "plans") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "plan-1",
                    code: "starter",
                    price_per_vehicle: 15000,
                    max_vehicles: 25,
                    is_active: true,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "paiements") {
          return { insert };
        }
        throw new Error(`table inattendue: ${table}`);
      }),
    };

    await expect(
      createBillingCheckoutForUser(
        supabase as never,
        {
          orgId: "00000000-0000-4000-8000-000000000001",
          fleetId: "00000000-0000-4000-8000-000000000002",
          planCode: "starter",
          vehicleCount: 26,
        },
        "manual",
      ),
    ).rejects.toThrow(/limite.*25/i);
    expect(insert).not.toHaveBeenCalled();
  });
});
