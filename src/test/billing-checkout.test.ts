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
    const insert = vi.fn();
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
          planCode: "pro",
          vehicleCount: 1,
        },
        "manual",
      ),
    ).rejects.toThrow(/Permission insuffisante/i);
    expect(insert).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith("rbac_check_permission", {
      p_action: "billing.manage",
      p_fleet_id: "00000000-0000-4000-8000-000000000002",
    });
  });
});
