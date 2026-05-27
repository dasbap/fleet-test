/** @vitest-environment node */
import { describe, expect, it, vi } from "vitest";
import { createBillingCheckoutForUser } from "@/server/domain/billingCheckout";

describe("createBillingCheckoutForUser", () => {
  it("calcule le montant depuis le plan et insère un paiement pending", async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "pay-1", status: "pending" },
          error: null,
        }),
      }),
    });
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "plans") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "plan-1",
                    code: "pro",
                    price_per_vehicle: 5000,
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

    const result = await createBillingCheckoutForUser(
      supabase as never,
      {
        orgId: "00000000-0000-4000-8000-000000000001",
        fleetId: "00000000-0000-4000-8000-000000000002",
        planCode: "pro",
        vehicleCount: 2,
        durationMonths: 3,
      },
      "manual",
    );

    expect(result.amountXaf).toBe(30000);
    expect(result.currency).toBe("XAF");
    expect(result.provider).toBe("manual");
    expect(insert).toHaveBeenCalled();
  });

  it("rejette vehicleCount < 1", async () => {
    const supabase = { from: vi.fn() };
    await expect(
      createBillingCheckoutForUser(
        supabase as never,
        {
          orgId: "00000000-0000-4000-8000-000000000001",
          fleetId: "00000000-0000-4000-8000-000000000002",
          planCode: "pro",
          vehicleCount: 0,
        },
        "manual",
      ),
    ).rejects.toThrow(/véhicule/i);
  });
});
