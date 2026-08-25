import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotchPayCallback } from "@/features/billing/hooks/useNotchPayCallback";
import { toast } from "@/hooks/use-toast";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    orgId: "00000000-0000-4000-8000-000000000001",
    activeTenantContext: { fleetId: "00000000-0000-4000-8000-000000000002" },
    session: { access_token: "test-access-token" },
  }),
}));

function CallbackProbe() {
  useNotchPayCallback();
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderCallbackRoute(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/dashboard/billing" element={<CallbackProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { invalidateSpy };
}

describe("useNotchPayCallback", () => {
  beforeEach(() => {
    vi.mocked(toast).mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ paymentStatus: "succeeded", subscriptionActivated: true }),
    });
  });

  it("reconcilie le paiement, nettoie les parametres et rafraichit tous les caches billing", async () => {
    const { invalidateSpy } = renderCallbackRoute(
      "/dashboard/billing?status=complete&ref=ESAMBA-MT8IILZ2-8EF2EA9AAB6B&reference=trx.test_u2ZsI1iKoesvrfh7fhZNkYip&trxref=ESAMBA-MT8IILZ2-8EF2EA9AAB6B&notchpay_trxref=ESAMBA-MT8IILZ2-8EF2EA9AAB6B",
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/billing/notch/reconcile",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ Authorization: "Bearer test-access-token" }),
        }),
      );
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      orgId: "00000000-0000-4000-8000-000000000001",
      fleetId: "00000000-0000-4000-8000-000000000002",
      merchantRef: "ESAMBA-MT8IILZ2-8EF2EA9AAB6B",
    });

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/billing");
      expect(screen.getByTestId("location")).not.toHaveTextContent("status=");
    });

    expect(toast).toHaveBeenCalledWith({
      title: "Abonnement activé",
      description: "Paiement confirmé — réf. ESAMBA-MT8IILZ2-8EF2EA9AAB6B.",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["billing-snapshot"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["fleet-billing-context"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["fleet-subscriptions"] });
  });
});
