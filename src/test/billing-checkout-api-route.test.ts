import { afterEach, describe, expect, it, vi } from "vitest";
import { initiateNotchPayCheckout } from "@/hooks/useBillingCheckout";

describe("initiateNotchPayCheckout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("appelle Notch Pay via la route Vercel same-origin /api", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          paymentId: "payment-1",
          reference: "NP-1",
          checkoutUrl: "https://checkout.notchpay.example/pay",
          amountXaf: 21000,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await initiateNotchPayCheckout({
      orgId: "00000000-0000-4000-8000-000000000001",
      fleetId: "00000000-0000-4000-8000-000000000002",
      planCode: "pro",
      planName: "Pro",
      vehicleCount: 1,
      durationMonths: 1,
      accessToken: "test-access-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/billing/notch/initiate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-access-token",
        }),
      }),
    );
  });
});
