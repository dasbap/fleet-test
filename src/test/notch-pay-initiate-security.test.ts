/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initiateNotchPayPayment } from "@/server/domain/notchPayInitiate";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const FLEET_ID = "00000000-0000-4000-8000-000000000002";
const VEHICLE_ID = "00000000-0000-4000-8000-000000000010";

function createSupabaseMock(vehicleIdsInFleet: string[] = []) {
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
});
