/** @vitest-environment node */
import { describe, expect, it, vi } from "vitest";
import { createBillingCheckoutForUser } from "@/server/domain/billingCheckout";
import { initiateMobileMoneyPaymentForUser } from "@/server/domain/mobileMoneyInitiate";
import { createServerOwnedPaymentIntent } from "@/server/domain/billing/paymentIntent";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const FLEET_ID = "00000000-0000-4000-8000-000000000002";
const VEHICLE_A = "00000000-0000-4000-8000-000000000010";
const VEHICLE_B = "00000000-0000-4000-8000-000000000011";

interface MockOptions {
  fleet?: unknown;
  fleetError?: { message: string } | null;
  permission?: unknown;
  permissionError?: { message: string } | null;
  plan?: unknown;
  planError?: { message: string } | null;
  payment?: unknown;
  paymentError?: { message: string } | null;
}

function createSupabaseMock(options: MockOptions = {}) {
  const fleet = options.fleet === undefined
    ? { id: FLEET_ID, org_id: ORG_ID }
    : options.fleet;
  const permission = options.permission === undefined
    ? { allowed: true }
    : options.permission;
  const plan = options.plan === undefined
    ? {
        id: "plan-1",
        code: "starter",
        price_per_vehicle: 15000,
        max_vehicles: 25,
        is_active: true,
      }
    : options.plan;
  const payment = options.payment === undefined
    ? {
        payment_id: "pay-1",
        status: "pending",
        amount_xaf: 15000,
        currency: "XAF",
      }
    : options.payment;

  const rpc = vi.fn(async (fn: string) => {
    if (fn === "rbac_check_permission") {
      return { data: permission, error: options.permissionError ?? null };
    }
    if (fn === "create_payment_intent") {
      return { data: payment, error: options.paymentError ?? null };
    }
    throw new Error(`rpc inattendue: ${fn}`);
  });

  const from = vi.fn((table: string) => {
    if (table === "flottes") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: fleet,
                error: options.fleetError ?? null,
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
              data: plan,
              error: options.planError ?? null,
            }),
          }),
        }),
      };
    }
    throw new Error(`table inattendue: ${table}`);
  });

  return { supabase: { rpc, from }, rpc, from };
}

const checkoutIntent = (overrides: Record<string, unknown> = {}) => ({
  orgId: ORG_ID,
  fleetId: FLEET_ID,
  planCode: "starter",
  vehicleCount: 1,
  durationMonths: 1,
  ...overrides,
});

const momoIntent = (overrides: Record<string, unknown> = {}) => ({
  orgId: ORG_ID,
  fleetId: FLEET_ID,
  provider: "orange_money" as const,
  phoneNumber: "+237600000000",
  amountXaf: 1,
  planCode: "starter",
  vehicleCount: 1,
  durationMonths: 1,
  ...overrides,
});

describe("payment security matrix — checkout", () => {
  it("refuse les doublons de véhicules avant toute création de paiement", async () => {
    const { supabase, rpc } = createSupabaseMock();

    await expect(
      createBillingCheckoutForUser(
        supabase as never,
        checkoutIntent({ vehicleCount: 2, vehicleIds: [VEHICLE_A, VEHICLE_A] }),
        "manual",
      ),
    ).rejects.toThrow(/doublons/i);

    expect(rpc).not.toHaveBeenCalledWith("create_payment_intent", expect.anything());
  });

  it("refuse une sélection dont la taille diffère du nombre facturé", async () => {
    const { supabase, rpc } = createSupabaseMock();

    await expect(
      createBillingCheckoutForUser(
        supabase as never,
        checkoutIntent({ vehicleCount: 2, vehicleIds: [VEHICLE_A] }),
        "manual",
      ),
    ).rejects.toThrow(/nombre de véhicules sélectionnés/i);

    expect(rpc).not.toHaveBeenCalledWith("create_payment_intent", expect.anything());
  });

  it("refuse une flotte absente ou hors organisation", async () => {
    const { supabase, rpc } = createSupabaseMock({ fleet: null });

    await expect(
      createBillingCheckoutForUser(supabase as never, checkoutIntent(), "manual"),
    ).rejects.toThrow(/flotte ne correspond pas/i);

    expect(rpc).not.toHaveBeenCalledWith("create_payment_intent", expect.anything());
  });

  it("propage une erreur de lecture de flotte", async () => {
    const { supabase } = createSupabaseMock({ fleetError: { message: "fleet read failed" } });

    await expect(
      createBillingCheckoutForUser(supabase as never, checkoutIntent(), "manual"),
    ).rejects.toThrow("fleet read failed");
  });

  it("refuse un utilisateur sans permission billing.manage", async () => {
    const { supabase, rpc } = createSupabaseMock({ permission: { allowed: false } });

    await expect(
      createBillingCheckoutForUser(supabase as never, checkoutIntent(), "manual"),
    ).rejects.toThrow(/Permission insuffisante/i);

    expect(rpc).not.toHaveBeenCalledWith("create_payment_intent", expect.anything());
  });

  it("refuse un plan absent", async () => {
    const { supabase, rpc } = createSupabaseMock({ plan: null });

    await expect(
      createBillingCheckoutForUser(supabase as never, checkoutIntent(), "manual"),
    ).rejects.toThrow(/Plan introuvable ou inactif/i);

    expect(rpc).not.toHaveBeenCalledWith("create_payment_intent", expect.anything());
  });

  it("refuse un plan inactif", async () => {
    const { supabase } = createSupabaseMock({
      plan: { id: "plan-1", code: "starter", price_per_vehicle: 15000, max_vehicles: 25, is_active: false },
    });

    await expect(
      createBillingCheckoutForUser(supabase as never, checkoutIntent(), "manual"),
    ).rejects.toThrow(/Plan introuvable ou inactif/i);
  });

  it("propage une erreur de lecture du plan", async () => {
    const { supabase } = createSupabaseMock({ planError: { message: "plan read failed" } });

    await expect(
      createBillingCheckoutForUser(supabase as never, checkoutIntent(), "manual"),
    ).rejects.toThrow("plan read failed");
  });

  it("refuse un montant nul ou négatif calculé côté serveur", async () => {
    const { supabase, rpc } = createSupabaseMock({
      plan: { id: "plan-1", code: "starter", price_per_vehicle: 0, max_vehicles: 25, is_active: true },
    });

    await expect(
      createBillingCheckoutForUser(supabase as never, checkoutIntent(), "manual"),
    ).rejects.toThrow(/Montant de checkout invalide/i);

    expect(rpc).not.toHaveBeenCalledWith("create_payment_intent", expect.anything());
  });

  it("utilise 1 mois par défaut et calcule le montant exclusivement depuis le plan", async () => {
    const { supabase, rpc } = createSupabaseMock({
      payment: { payment_id: "pay-1", status: "pending", amount_xaf: 30000, currency: "XAF" },
    });

    const result = await createBillingCheckoutForUser(
      supabase as never,
      checkoutIntent({ vehicleCount: 2, durationMonths: undefined }),
      "manual",
    );

    expect(result.amountXaf).toBe(30000);
    expect(rpc).toHaveBeenCalledWith(
      "create_payment_intent",
      expect.objectContaining({
        p_vehicle_count: 2,
        p_duration_months: 1,
        p_expected_amount: 30000,
        p_provider: "manual",
        p_checkout: true,
      }),
    );
  });

  it("transmet exactement la sélection de véhicules au RPC serveur", async () => {
    const { supabase, rpc } = createSupabaseMock({
      payment: { payment_id: "pay-1", status: "pending", amount_xaf: 30000, currency: "XAF" },
    });

    await createBillingCheckoutForUser(
      supabase as never,
      checkoutIntent({ vehicleCount: 2, vehicleIds: [VEHICLE_A, VEHICLE_B] }),
      "manual",
    );

    expect(rpc).toHaveBeenCalledWith(
      "create_payment_intent",
      expect.objectContaining({ p_vehicle_ids: [VEHICLE_A, VEHICLE_B] }),
    );
  });
});

describe("payment security matrix — Mobile Money", () => {
  it("refuse un nombre de véhicules inférieur à 1", async () => {
    const { supabase, rpc } = createSupabaseMock();

    await expect(
      initiateMobileMoneyPaymentForUser(supabase as never, momoIntent({ vehicleCount: 0 })),
    ).rejects.toThrow(/Au moins un vehicule/i);

    expect(rpc).not.toHaveBeenCalledWith("create_payment_intent", expect.anything());
  });

  it("refuse les doublons de véhicules", async () => {
    const { supabase } = createSupabaseMock();

    await expect(
      initiateMobileMoneyPaymentForUser(
        supabase as never,
        momoIntent({ vehicleCount: 2, vehicleIds: [VEHICLE_A, VEHICLE_A] }),
      ),
    ).rejects.toThrow(/doublons/i);
  });

  it("refuse un nombre sélectionné différent du nombre facturé", async () => {
    const { supabase } = createSupabaseMock();

    await expect(
      initiateMobileMoneyPaymentForUser(
        supabase as never,
        momoIntent({ vehicleCount: 2, vehicleIds: [VEHICLE_A] }),
      ),
    ).rejects.toThrow(/nombre de véhicules sélectionnés/i);
  });

  it("refuse un plan absent ou inactif", async () => {
    const { supabase, rpc } = createSupabaseMock({ plan: null });

    await expect(
      initiateMobileMoneyPaymentForUser(supabase as never, momoIntent()),
    ).rejects.toThrow(/Plan introuvable ou inactif/i);

    expect(rpc).not.toHaveBeenCalledWith("create_payment_intent", expect.anything());
  });

  it("propage une erreur de lecture du plan", async () => {
    const { supabase } = createSupabaseMock({ planError: { message: "momo plan failed" } });

    await expect(
      initiateMobileMoneyPaymentForUser(supabase as never, momoIntent()),
    ).rejects.toThrow("momo plan failed");
  });

  it("refuse un montant calculé nul", async () => {
    const { supabase } = createSupabaseMock({
      plan: { id: "plan-1", code: "starter", price_per_vehicle: 0, max_vehicles: 25, is_active: true },
    });

    await expect(
      initiateMobileMoneyPaymentForUser(supabase as never, momoIntent()),
    ).rejects.toThrow(/Montant invalide/i);
  });

  it("ignore le montant fourni par le client et utilise le prix serveur", async () => {
    const { supabase, rpc } = createSupabaseMock({
      payment: { payment_id: "pay-1", status: "pending", amount_xaf: 45000, currency: "XAF" },
    });

    await initiateMobileMoneyPaymentForUser(
      supabase as never,
      momoIntent({ amountXaf: 1, vehicleCount: 3 }),
    );

    expect(rpc).toHaveBeenCalledWith(
      "create_payment_intent",
      expect.objectContaining({ p_expected_amount: 45000, p_vehicle_count: 3 }),
    );
  });

  it("utilise 1 mois par défaut", async () => {
    const { supabase, rpc } = createSupabaseMock();

    await initiateMobileMoneyPaymentForUser(
      supabase as never,
      momoIntent({ durationMonths: undefined }),
    );

    expect(rpc).toHaveBeenCalledWith(
      "create_payment_intent",
      expect.objectContaining({ p_duration_months: 1 }),
    );
  });

  it("transmet le téléphone, le provider et les véhicules au RPC serveur", async () => {
    const { supabase, rpc } = createSupabaseMock({
      payment: { payment_id: "pay-1", status: "pending", amount_xaf: 30000, currency: "XAF" },
    });

    await initiateMobileMoneyPaymentForUser(
      supabase as never,
      momoIntent({
        provider: "mtn_momo",
        phoneNumber: "+237699999999",
        vehicleCount: 2,
        vehicleIds: [VEHICLE_A, VEHICLE_B],
      }),
    );

    expect(rpc).toHaveBeenCalledWith(
      "create_payment_intent",
      expect.objectContaining({
        p_provider: "mtn_momo",
        p_phone_number: "+237699999999",
        p_vehicle_ids: [VEHICLE_A, VEHICLE_B],
        p_checkout: false,
      }),
    );
  });

  it("retourne des instructions cohérentes avec Orange Money", async () => {
    const { supabase } = createSupabaseMock();

    const result = await initiateMobileMoneyPaymentForUser(
      supabase as never,
      momoIntent({ provider: "orange_money" }),
    );

    expect(result.instructions.provider).toBe("orange_money");
    expect(result.instructions.providerLabel).toBe("Orange Money");
    expect(result.instructions.steps.join(" ")).toMatch(/#150\*50#/);
  });

  it("retourne des instructions cohérentes avec MTN MoMo", async () => {
    const { supabase } = createSupabaseMock();

    const result = await initiateMobileMoneyPaymentForUser(
      supabase as never,
      momoIntent({ provider: "mtn_momo" }),
    );

    expect(result.instructions.provider).toBe("mtn_momo");
    expect(result.instructions.providerLabel).toBe("MTN MoMo");
    expect(result.instructions.steps.join(" ")).toMatch(/\*126#/);
  });
});

describe("payment security matrix — server-owned payment intent", () => {
  const baseInput = {
    orgId: ORG_ID,
    fleetId: FLEET_ID,
    planCode: "starter",
    vehicleCount: 1,
    durationMonths: 1,
    provider: "manual",
    externalRef: "ESAMBA-TEST",
    idempotencyKey: "idem-1",
    expectedAmountXaf: 15000,
  };

  it("propage une erreur RPC sans fabriquer de paiement", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "payment rpc failed" } }),
    };

    await expect(
      createServerOwnedPaymentIntent(supabase as never, baseInput),
    ).rejects.toThrow("payment rpc failed");
  });

  it("refuse une réponse RPC nulle", async () => {
    const supabase = { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) };

    await expect(
      createServerOwnedPaymentIntent(supabase as never, baseInput),
    ).rejects.toThrow(/Réponse de création de paiement invalide/i);
  });

  it.each([
    [{ status: "pending", amount_xaf: 15000, currency: "XAF" }, "payment_id"],
    [{ payment_id: "pay-1", amount_xaf: 15000, currency: "XAF" }, "status"],
    [{ payment_id: "pay-1", status: "pending", currency: "XAF" }, "amount_xaf"],
    [{ payment_id: "pay-1", status: "pending", amount_xaf: 15000 }, "currency"],
  ])("refuse une réponse RPC sans champ obligatoire %s", async (data) => {
    const supabase = { rpc: vi.fn().mockResolvedValue({ data, error: null }) };

    await expect(
      createServerOwnedPaymentIntent(supabase as never, baseInput),
    ).rejects.toThrow(/Réponse de création de paiement invalide/i);
  });

  it("normalise les paramètres optionnels absents en null et checkout à false", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { payment_id: "pay-1", status: "pending", amount_xaf: 15000, currency: "XAF" },
      error: null,
    });
    const supabase = { rpc };

    await createServerOwnedPaymentIntent(supabase as never, baseInput);

    expect(rpc).toHaveBeenCalledWith(
      "create_payment_intent",
      expect.objectContaining({
        p_vehicle_ids: null,
        p_phone_number: null,
        p_checkout: false,
      }),
    );
  });
});
