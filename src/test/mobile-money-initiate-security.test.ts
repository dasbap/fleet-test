/** @vitest-environment node */
import { describe, expect, it, vi } from "vitest";
import { initiateMobileMoneyPaymentForUser } from "@/server/domain/mobileMoneyInitiate";

describe("initiateMobileMoneyPaymentForUser security", () => {
  it("recalcule le montant depuis le plan au lieu de faire confiance au client", async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "pay-1" },
          error: null,
        }),
      }),
    });
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

    const result = await initiateMobileMoneyPaymentForUser(
      supabase as never,
      {
        orgId: "00000000-0000-4000-8000-000000000001",
        fleetId: "00000000-0000-4000-8000-000000000002",
        provider: "orange_money",
        phoneNumber: "+237600000000",
        amountXaf: 1,
        planCode: "starter",
        vehicleCount: 2,
        durationMonths: 3,
      },
    );

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 90000,
        raw_payload: expect.objectContaining({
          vehicleCount: 2,
          durationMonths: 3,
        }),
      }),
    );
    expect(result.instructions.amountXaf).toBe(90000);
  });
});
