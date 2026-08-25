/** @vitest-environment node */
import { describe, expect, it, vi } from "vitest";
import { createBillingCheckoutForUser } from "@/server/domain/billingCheckout";

describe("createBillingCheckoutForUser", () => {
  it("calcule le montant depuis le plan et crée un paiement pending", async () => {
    const rpc = vi.fn(async (fn: string) => {
      if (fn === "rbac_check_permission") {
        return { data: { allowed: true }, error: null };
      }
      if (fn === "create_payment_intent") {
        return {
          data: {
            payment_id: "pay-1",
            status: "pending",
            amount_xaf: 30000,
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
                    code: "pro",
                    price_per_vehicle: 5000,
                    max_vehicles: null,
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
    expect(rpc).toHaveBeenCalledWith(
      "create_payment_intent",
      expect.objectContaining({
        p_org_id: "00000000-0000-4000-8000-000000000001",
        p_fleet_id: "00000000-0000-4000-8000-000000000002",
        p_plan_code: "pro",
        p_vehicle_count: 2,
        p_duration_months: 3,
        p_provider: "manual",
        p_expected_amount: 30000,
        p_checkout: true,
      }),
    );
  });

  it("rejette vehicleCount < 1", async () => {
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
        throw new Error(`table inattendue: ${table}`);
      }),
    };
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

  it("exige billing.manage avant de creer le paiement", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: { allowed: false }, error: null }),
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
        throw new Error(`table inattendue: ${table}`);
      }),
    };

    await expect(
      createBillingCheckoutForUser(
        supabase as never,
        {
          orgId: "00000000-0000-4000-8000-000000000001",
          fleetId: "00000000-0000-4000-8000-000000000002",
          planCode: "pro",
          vehicleCount: 1,
        },
        "manual",
      ),
    ).rejects.toThrow(/Permission insuffisante/i);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith("rbac_check_permission", {
      p_action: "billing.manage",
      p_fleet_id: "00000000-0000-4000-8000-000000000002",
    });
  });
});
