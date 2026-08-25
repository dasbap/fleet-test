/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initiateNotchPayPayment } from "@/server/domain/notchPayInitiate";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const FLEET_ID = "00000000-0000-4000-8000-000000000002";
const VEHICLE_ID = "00000000-0000-4000-8000-000000000010";
const PAYMENT_ID = "00000000-0000-4000-8000-000000000099";

function createSupabaseMock(vehicleIdsInFleet: string[] = [], userEmail = "payeur@example.test") {
  const rpc = vi.fn(async (fn: string) => {
    if (fn === "rbac_check_permission") {
      return { data: { allowed: true }, error: null };
    }
    if (fn === "create_payment_intent") {
      return {
        data: {
          payment_id: PAYMENT_ID,
          reference: "ESAMBA-TEST",
          amount_xaf: 15000,
          currency: "XAF",
          status: "initiated",
        },
        error: null,
      };
    }
    if (fn === "ensure_pending_subscription_for_payment") {
      return {
        data: "00000000-0000-4000-8000-000000000199",
        error: null,
      };
    }
    throw new Error(`rpc inattendue: ${fn}`);
  });

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { email: userEmail } },
        error: null,
      }),
    },
    rpc,
    from: vi.fn((table: string) => {
      if (table === "flottes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: FLEET_ID, org_id: ORG_ID },
                  error: null,
                }),
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
                  data: vehicleIdsInFleet.map((id) => ({ id })),
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

  return { supabase, rpc };
}

describe("initiateNotchPayPayment security", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NOTCH_PAY_API_KEY = "test-notch-key";
    process.env.APP_URL = "https://www.e-samba.com";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("rejects selected vehicle count mismatches before contacting Notch Pay", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase, rpc } = createSupabaseMock();

    await expect(
      initiateNotchPayPayment(supabase as never, {
        orgId: ORG_ID,
        fleetId: FLEET_ID,
        planCode: "starter",
        vehicleCount: 2,
        durationMonths: 1,
        vehicleIds: [VEHICLE_ID],
      }),
    ).rejects.toThrow(/correspondre au nombre de vehicules factures/i);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalledWith("create_payment_intent", expect.anything());
  });

  it("rejects durations above the billing limit before contacting Notch Pay", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = createSupabaseMock();

    await expect(
      initiateNotchPayPayment(supabase as never, {
        orgId: ORG_ID,
        fleetId: FLEET_ID,
        planCode: "starter",
        vehicleCount: 1,
        durationMonths: 37,
      }),
    ).rejects.toThrow(/entre 1 et 36 mois/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects vehicles outside the fleet before contacting Notch Pay", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { supabase } = createSupabaseMock([]);

    await expect(
      initiateNotchPayPayment(supabase as never, {
        orgId: ORG_ID,
        fleetId: FLEET_ID,
        planCode: "starter",
        vehicleCount: 1,
        durationMonths: 1,
        vehicleIds: [VEHICLE_ID],
      }),
    ).rejects.toThrow(/ne correspond pas aux vehicules de la flotte/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts the documented top-level Notch Pay authorization URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        code: 201,
        status: "Accepted",
        message: "Payment initialized",
        transaction: {
          reference: "trx.test_top_level_url",
          amount: 15000,
          currency: "XAF",
          status: "pending",
        },
        authorization_url: "https://pay.notchpay.co/pay_test_top_level_url",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { supabase, rpc } = createSupabaseMock([], "owner@example.test");

    const result = await initiateNotchPayPayment(supabase as never, {
      orgId: ORG_ID,
      fleetId: FLEET_ID,
      planCode: "starter",
      vehicleCount: 1,
      durationMonths: 1,
    });

    expect(result.checkoutUrl).toBe("https://pay.notchpay.co/pay_test_top_level_url");
    expect(result.reference).toBe("trx.test_top_level_url");
    expect(rpc).toHaveBeenCalledWith("ensure_pending_subscription_for_payment", {
      p_payment_id: PAYMENT_ID,
    });
  });

  it("uses the authenticated user email when no payment contact is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        transaction: {
          reference: "trx.test_contact",
          authorization_url: "https://checkout.notchpay.example/pay",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { supabase, rpc } = createSupabaseMock([], "owner@example.test");

    await initiateNotchPayPayment(supabase as never, {
      orgId: ORG_ID,
      fleetId: FLEET_ID,
      planCode: "starter",
      vehicleCount: 1,
      durationMonths: 1,
    });

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body as string) as { email?: string; phone?: string };
    expect(payload.email).toBe("owner@example.test");
    expect(payload.phone).toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("ensure_pending_subscription_for_payment", {
      p_payment_id: PAYMENT_ID,
    });
  });
});
