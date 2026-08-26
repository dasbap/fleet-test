/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initiateNotchPayPayment } from "@/server/domain/notchPayInitiate";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const FLEET_ID = "00000000-0000-4000-8000-000000000002";
const VEHICLE_A = "00000000-0000-4000-8000-000000000010";
const VEHICLE_B = "00000000-0000-4000-8000-000000000011";
const PAYMENT_ID = "00000000-0000-4000-8000-000000000099";

interface Options {
  fleet?: unknown;
  fleetError?: { message: string } | null;
  permission?: unknown;
  permissionError?: { message: string } | null;
  vehicles?: string[];
  vehiclesError?: { message: string } | null;
  plan?: unknown;
  planError?: { message: string } | null;
  payment?: unknown;
  paymentError?: { message: string } | null;
  pendingError?: { message: string } | null;
  userEmail?: string | null;
  userError?: { message: string } | null;
}

function makeSupabase(options: Options = {}) {
  const fleet = options.fleet === undefined ? { id: FLEET_ID, org_id: ORG_ID } : options.fleet;
  const permission = options.permission === undefined ? { allowed: true } : options.permission;
  const vehicles = options.vehicles ?? [];
  const plan = options.plan === undefined
    ? { id: "plan-1", price_per_vehicle: 15000, max_vehicles: 25, is_active: true }
    : options.plan;
  const payment = options.payment === undefined
    ? { payment_id: PAYMENT_ID, status: "initiated", amount_xaf: 15000, currency: "XAF" }
    : options.payment;

  const rpc = vi.fn(async (fn: string) => {
    if (fn === "rbac_check_permission") {
      return { data: permission, error: options.permissionError ?? null };
    }
    if (fn === "create_payment_intent") {
      return { data: payment, error: options.paymentError ?? null };
    }
    if (fn === "ensure_pending_subscription_for_payment") {
      return { data: "sub-pending", error: options.pendingError ?? null };
    }
    throw new Error(`rpc inattendue: ${fn}`);
  });

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.userEmail === null ? null : { email: options.userEmail ?? "owner@example.test" } },
        error: options.userError ?? null,
      }),
    },
    rpc,
    from: vi.fn((table: string) => {
      if (table === "flottes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: fleet, error: options.fleetError ?? null }),
              }),
            }),
          }),
        };
      }
      if (table === "vehicules") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                returns: vi.fn().mockResolvedValue({
                  data: vehicles.map((id) => ({ id })),
                  error: options.vehiclesError ?? null,
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
              maybeSingle: vi.fn().mockResolvedValue({ data: plan, error: options.planError ?? null }),
            }),
          }),
        };
      }
      throw new Error(`table inattendue: ${table}`);
    }),
  };

  return { supabase, rpc };
}

function intent(overrides: Record<string, unknown> = {}) {
  return {
    orgId: ORG_ID,
    fleetId: FLEET_ID,
    planCode: "starter",
    vehicleCount: 1,
    durationMonths: 1,
    ...overrides,
  };
}

function okNotchResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 201,
    json: vi.fn().mockResolvedValue({
      transaction: {
        reference: "trx-secure",
        authorization_url: "https://checkout.notchpay.example/pay",
      },
      ...overrides,
    }),
  };
}

describe("Notch Pay exhaustive security matrix", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NOTCH_PAY_API_KEY = "test-notch-key";
    process.env.APP_URL = "https://www.e-samba.com";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("refuse de démarrer sans clé API avant tout appel externe", async () => {
    delete process.env.NOTCH_PAY_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase();

    await expect(initiateNotchPayPayment(supabase as never, intent())).rejects.toThrow(/NOTCH_PAY_API_KEY/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, 37])("refuse une durée invalide %s avant le réseau", async (durationMonths) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase();

    await expect(
      initiateNotchPayPayment(supabase as never, intent({ durationMonths })),
    ).rejects.toThrow(/entre 1 et 36 mois/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse vehicleCount=0 avant le réseau", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase();

    await expect(
      initiateNotchPayPayment(supabase as never, intent({ vehicleCount: 0 })),
    ).rejects.toThrow(/Au moins un véhicule/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse les doublons de véhicules avant le réseau", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase();

    await expect(
      initiateNotchPayPayment(
        supabase as never,
        intent({ vehicleCount: 2, vehicleIds: [VEHICLE_A, VEHICLE_A] }),
      ),
    ).rejects.toThrow(/doublons/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propage une erreur de vérification des véhicules avant le réseau", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase({ vehiclesError: { message: "vehicle lookup failed" } });

    await expect(
      initiateNotchPayPayment(
        supabase as never,
        intent({ vehicleIds: [VEHICLE_A] }),
      ),
    ).rejects.toThrow("vehicle lookup failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse une sélection contenant un véhicule hors flotte", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase({ vehicles: [VEHICLE_A] });

    await expect(
      initiateNotchPayPayment(
        supabase as never,
        intent({ vehicleCount: 2, vehicleIds: [VEHICLE_A, VEHICLE_B] }),
      ),
    ).rejects.toThrow(/ne correspond pas aux vehicules de la flotte/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse un plan absent ou inactif avant le réseau", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase({ plan: null });

    await expect(initiateNotchPayPayment(supabase as never, intent())).rejects.toThrow(/Plan introuvable ou inactif/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propage une erreur de lecture du plan avant le réseau", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase({ planError: { message: "plan lookup failed" } });

    await expect(initiateNotchPayPayment(supabase as never, intent())).rejects.toThrow("plan lookup failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse un montant serveur nul ou non fini", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase({
      plan: { id: "plan-1", price_per_vehicle: 0, max_vehicles: 25, is_active: true },
    });

    await expect(initiateNotchPayPayment(supabase as never, intent())).rejects.toThrow(/Montant invalide/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propage une erreur auth lorsqu'aucun contact explicite n'est fourni", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase({ userError: { message: "auth unavailable" } });

    await expect(initiateNotchPayPayment(supabase as never, intent())).rejects.toThrow("auth unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse un utilisateur sans email si aucun téléphone ou email n'est fourni", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase({ userEmail: null });

    await expect(initiateNotchPayPayment(supabase as never, intent())).rejects.toThrow(/email ou un téléphone est requis/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("préfère le contact explicite et ne consulte pas auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okNotchResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase({ userError: { message: "auth should not run" } });

    await initiateNotchPayPayment(
      supabase as never,
      intent({ email: " payer@example.test ", phone: " +237699999999 " }),
    );

    expect(supabase.auth.getUser).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body as string);
    expect(payload.email).toBe("payer@example.test");
    expect(payload.phone).toBe("+237699999999");
  });

  it("envoie toujours le montant XAF calculé côté serveur et les métadonnées métier", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okNotchResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase({
      payment: { payment_id: PAYMENT_ID, status: "initiated", amount_xaf: 90000, currency: "XAF" },
    });

    await initiateNotchPayPayment(
      supabase as never,
      intent({ vehicleCount: 2, durationMonths: 3, email: "payer@example.test" }),
    );

    const [url, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body as string);
    expect(url).toBe("https://api.notchpay.co/payments");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("test-notch-key");
    expect(payload.amount).toBe(90000);
    expect(payload.currency).toBe("XAF");
    expect(payload.metadata).toEqual({
      fleetId: FLEET_ID,
      orgId: ORG_ID,
      planCode: "starter",
      vehicleCount: "2",
      durationMonths: "3",
    });
  });

  it("rejette proprement une erreur HTTP Notch Pay et borne le corps d'erreur", async () => {
    const longBody = "x".repeat(800);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: vi.fn().mockResolvedValue(longBody),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { supabase, rpc } = makeSupabase();

    await expect(initiateNotchPayPayment(supabase as never, intent({ email: "payer@example.test" })))
      .rejects.toThrow(/Notch Pay API error 502/);
    expect(rpc).not.toHaveBeenCalledWith("create_payment_intent", expect.anything());
  });

  it("refuse une réponse Notch Pay sans URL de paiement", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ transaction: { reference: "trx-no-url" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { supabase, rpc } = makeSupabase();

    await expect(initiateNotchPayPayment(supabase as never, intent({ email: "payer@example.test" })))
      .rejects.toThrow(/pas retourné d'URL de paiement/i);
    expect(rpc).not.toHaveBeenCalledWith("create_payment_intent", expect.anything());
  });

  it("accepte l'URL imbriquée transaction.authorization_url", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okNotchResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase();

    const result = await initiateNotchPayPayment(supabase as never, intent({ email: "payer@example.test" }));

    expect(result.checkoutUrl).toBe("https://checkout.notchpay.example/pay");
    expect(result.reference).toBe("trx-secure");
  });

  it("propage une erreur de création du payment intent après succès PSP", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okNotchResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { supabase, rpc } = makeSupabase({ paymentError: { message: "intent persistence failed" } });

    await expect(initiateNotchPayPayment(supabase as never, intent({ email: "payer@example.test" })))
      .rejects.toThrow("intent persistence failed");
    expect(rpc).not.toHaveBeenCalledWith("ensure_pending_subscription_for_payment", expect.anything());
  });

  it("propage une erreur de préparation d'abonnement pending", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okNotchResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = makeSupabase({ pendingError: { message: "pending subscription failed" } });

    await expect(initiateNotchPayPayment(supabase as never, intent({ email: "payer@example.test" })))
      .rejects.toThrow("pending subscription failed");
  });

  it("lie le payment intent à la référence PSP et crée l'abonnement pending", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okNotchResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { supabase, rpc } = makeSupabase({
      payment: { payment_id: PAYMENT_ID, status: "initiated", amount_xaf: 15000, currency: "XAF" },
    });

    await initiateNotchPayPayment(supabase as never, intent({ email: "payer@example.test" }));

    expect(rpc).toHaveBeenCalledWith(
      "create_payment_intent",
      expect.objectContaining({
        p_provider: "notch",
        p_external_ref: "trx-secure",
        p_expected_amount: 15000,
      }),
    );
    expect(rpc).toHaveBeenCalledWith("ensure_pending_subscription_for_payment", {
      p_payment_id: PAYMENT_ID,
    });
  });
});
