/** @vitest-environment node */
import { describe, expect, it, vi } from "vitest";
import { createBillingCheckoutForUser } from "@/server/domain/billingCheckout";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const FLEET_ID = "00000000-0000-4000-8000-000000000002";

function createFleetQuery(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eqOrg = vi.fn().mockReturnValue({ maybeSingle });
  const eqFleet = vi.fn().mockReturnValue({ eq: eqOrg });
  const select = vi.fn().mockReturnValue({ eq: eqFleet });
  return { select, eqFleet, eqOrg, maybeSingle };
}

function createPlanQuery() {
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

describe("createBillingCheckoutForUser", () => {
  it("calcule le montant depuis le plan et crée un paiement pending", async () => {
    const fleetQuery = createFleetQuery({
      data: { id: FLEET_ID, org_id: ORG_ID },
      error: null,
    });
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
        if (table === "flottes") return fleetQuery;
        if (table === "plans") return createPlanQuery();
        throw new Error(`table inattendue: ${table}`);
      }),
    };

    const result = await createBillingCheckoutForUser(
      supabase as never,
      {
        orgId: ORG_ID,
        fleetId: FLEET_ID,
        planCode: "pro",
        vehicleCount: 2,
        durationMonths: 3,
      },
      "manual",
    );

    expect(result.amountXaf).toBe(30000);
    expect(result.currency).toBe("XAF");
    expect(result.provider).toBe("manual");
    expect(fleetQuery.select).toHaveBeenCalledWith("id, org_id");
    expect(fleetQuery.eqFleet).toHaveBeenCalledWith("id", FLEET_ID);
    expect(fleetQuery.eqOrg).toHaveBeenCalledWith("org_id", ORG_ID);
    expect(rpc).toHaveBeenCalledWith(
      "create_payment_intent",
      expect.objectContaining({
        p_org_id: ORG_ID,
        p_fleet_id: FLEET_ID,
        p_plan_code: "pro",
        p_vehicle_count: 2,
        p_duration_months: 3,
        p_provider: "manual",
        p_expected_amount: 30000,
        p_vehicle_ids: null,
        p_checkout: true,
      }),
    );
  });

  it("rejette vehicleCount < 1", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: { allowed: true }, error: null }),
      from: vi.fn((table: string) => {
        if (table === "flottes") {
          return createFleetQuery({
            data: { id: FLEET_ID, org_id: ORG_ID },
            error: null,
          });
        }
        throw new Error(`table inattendue: ${table}`);
      }),
    };
    await expect(
      createBillingCheckoutForUser(
        supabase as never,
        {
          orgId: ORG_ID,
          fleetId: FLEET_ID,
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
          return createFleetQuery({
            data: { id: FLEET_ID, org_id: ORG_ID },
            error: null,
          });
        }
        throw new Error(`table inattendue: ${table}`);
      }),
    };

    await expect(
      createBillingCheckoutForUser(
        supabase as never,
        {
          orgId: ORG_ID,
          fleetId: FLEET_ID,
          planCode: "pro",
          vehicleCount: 1,
        },
        "manual",
      ),
    ).rejects.toThrow(/Permission insuffisante/i);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith("rbac_check_permission", {
      p_action: "billing.manage",
      p_fleet_id: FLEET_ID,
    });
  });

  it("propage une erreur de lecture de flotte avant tout contrôle RBAC", async () => {
    const supabase = {
      rpc: vi.fn(),
      from: vi.fn(() => createFleetQuery({ data: null, error: { message: "fleet lookup failed" } })),
    };

    await expect(
      createBillingCheckoutForUser(
        supabase as never,
        { orgId: ORG_ID, fleetId: FLEET_ID, planCode: "pro", vehicleCount: 1 },
        "manual",
      ),
    ).rejects.toThrow("fleet lookup failed");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("refuse une flotte qui ne correspond pas à l'organisation demandée", async () => {
    const supabase = {
      rpc: vi.fn(),
      from: vi.fn(() => createFleetQuery({ data: null, error: null })),
    };

    await expect(
      createBillingCheckoutForUser(
        supabase as never,
        { orgId: ORG_ID, fleetId: FLEET_ID, planCode: "pro", vehicleCount: 1 },
        "manual",
      ),
    ).rejects.toThrow(/flotte ne correspond pas/i);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("propage une erreur du contrôle de permission billing.manage", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "rbac unavailable" } }),
      from: vi.fn(() =>
        createFleetQuery({ data: { id: FLEET_ID, org_id: ORG_ID }, error: null }),
      ),
    };

    await expect(
      createBillingCheckoutForUser(
        supabase as never,
        { orgId: ORG_ID, fleetId: FLEET_ID, planCode: "pro", vehicleCount: 1 },
        "manual",
      ),
    ).rejects.toThrow("rbac unavailable");
  });

  it("propage une erreur de création du paiement", async () => {
    const rpc = vi.fn(async (fn: string) => {
      if (fn === "rbac_check_permission") return { data: { allowed: true }, error: null };
      if (fn === "create_payment_intent") return { data: null, error: { message: "payment rpc failed" } };
      throw new Error(`rpc inattendue: ${fn}`);
    });
    const supabase = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === "flottes") {
          return createFleetQuery({ data: { id: FLEET_ID, org_id: ORG_ID }, error: null });
        }
        if (table === "plans") return createPlanQuery();
        throw new Error(`table inattendue: ${table}`);
      }),
    };

    await expect(
      createBillingCheckoutForUser(
        supabase as never,
        { orgId: ORG_ID, fleetId: FLEET_ID, planCode: "pro", vehicleCount: 1 },
        "manual",
      ),
    ).rejects.toThrow("payment rpc failed");
  });

  it("refuse une réponse de création de paiement incomplète", async () => {
    const rpc = vi.fn(async (fn: string) => {
      if (fn === "rbac_check_permission") return { data: { allowed: true }, error: null };
      if (fn === "create_payment_intent") {
        return { data: { payment_id: "pay-1", status: "pending", amount_xaf: null, currency: "XAF" }, error: null };
      }
      throw new Error(`rpc inattendue: ${fn}`);
    });
    const supabase = {
      rpc,
      from: vi.fn((table: string) => {
        if (table === "flottes") {
          return createFleetQuery({ data: { id: FLEET_ID, org_id: ORG_ID }, error: null });
        }
        if (table === "plans") return createPlanQuery();
        throw new Error(`table inattendue: ${table}`);
      }),
    };

    await expect(
      createBillingCheckoutForUser(
        supabase as never,
        { orgId: ORG_ID, fleetId: FLEET_ID, planCode: "pro", vehicleCount: 1 },
        "manual",
      ),
    ).rejects.toThrow(/Réponse de création de paiement invalide/i);
  });
});
