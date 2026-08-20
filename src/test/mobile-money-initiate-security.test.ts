/** @vitest-environment node */
import { describe, expect, it, vi } from "vitest";
import { initiateMobileMoneyPaymentForUser } from "@/server/domain/mobileMoneyInitiate";

describe("initiateMobileMoneyPaymentForUser security", () => {
  it("recalcule le montant depuis le plan au lieu de faire confiance au client", async () => {
    const rpc = vi.fn(async (fn: string) => {
      if (fn === "rbac_check_permission") {
        return { data: { allowed: true }, error: null };
      }
      if (fn === "create_payment_intent") {
        return {
          data: {
            payment_id: "pay-1",
            status: "pending",
            amount_xaf: 90000,
            currency: "XAF",
          },
          error: null,
        };
      }
      throw new Error(`rpc inattendue: ${fn}`);
    });
    const supabase = {
      rpc,
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

    expect(rpc).toHaveBeenCalledWith(
      "create_payment_intent",
      expect.objectContaining({
        p_org_id: "00000000-0000-4000-8000-000000000001",
        p_fleet_id: "00000000-0000-4000-8000-000000000002",
        p_plan_code: "starter",
        p_vehicle_count: 2,
        p_duration_months: 3,
        p_provider: "orange_money",
        p_expected_amount: 90000,
        p_phone_number: "+237600000000",
        p_checkout: false,
      }),
    );
    expect(result.instructions.amountXaf).toBe(90000);
  });
});
