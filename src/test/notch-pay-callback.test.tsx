import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotchPayCallback } from "@/features/billing/hooks/useNotchPayCallback";
import { toast } from "@/hooks/use-toast";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

function CallbackProbe() {
  useNotchPayCallback();
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderCallbackRoute(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
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
  });

  it("nettoie les parametres retour Notch Pay et rafraichit la facturation", async () => {
    const { invalidateSpy } = renderCallbackRoute(
      "/dashboard/billing?status=success&ref=ESAMBA-MT8IILZ2-8EF2EA9AAB6B&reference=trx.test_u2ZsI1iKoesvrfh7fhZNkYip&trxref=ESAMBA-MT8IILZ2-8EF2EA9AAB6B&notchpay_trxref=ESAMBA-MT8IILZ2-8EF2EA9AAB6B&status=complete",
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/dashboard/billing");
    });

    expect(toast).toHaveBeenCalledWith({
      title: "Paiement re\u00e7u",
      description:
        "R\u00e9f. ESAMBA-MT8IILZ2-8EF2EA9AAB6B - activation en cours via webhook. Rechargez dans quelques instants.",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["fleet-billing-context"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["payment-history"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["billing-events"] });
  });
});
