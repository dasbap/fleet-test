/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initiateNotchPayPayment } from "@/server/domain/notchPayInitiate";

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
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          transaction: {
            authorization_url: "https://pay.notchpay.co/checkout/test",
            reference: "notch-ref",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rpc = vi.fn(async (fn: string) => {
      if (fn === "rbac_check_permission") {
        return { data: { allowed: true }, error: null };
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

    await expect(
      initiateNotchPayPayment(supabase as never, {
        orgId: "00000000-0000-4000-8000-000000000001",
        fleetId: "00000000-0000-4000-8000-000000000002",
        planCode: "starter",
        vehicleCount: 2,
        durationMonths: 1,
        vehicleIds: ["00000000-0000-4000-8000-000000000010"],
      }),
    ).rejects.toThrow(/correspondre au nombre de vehicules factures/i);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalledWith("create_payment_intent", expect.anything());
  });
});
