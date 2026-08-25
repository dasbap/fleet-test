import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PlanGuard } from "./PlanGuard";

const { mockUseAuth, mockUseBilling } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseBilling: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useBilling", () => ({
  useBilling: () => mockUseBilling(),
}));

function mockAuthenticatedUser() {
  mockUseAuth.mockReturnValue({
    user: { id: "u1" },
    orgId: "o1",
    activeTenantContext: { fleetId: "f1", role: "organizer" },
    isLoading: false,
  });
}

function billingWith(status: string, code = "pro") {
  return {
    data: {
      lapsedPaid: false,
      subscription: {
        id: "s1",
        status,
        startsAt: "",
        endsAt: "",
        plan: { id: "p1", code, name: "Pro", pricePerVehicle: 0 },
      },
      recentPayments: [],
    },
    isLoading: false,
  };
}

describe("PlanGuard", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseBilling.mockReset();
  });

  it("affiche les enfants lorsque plan payant actif", () => {
    mockAuthenticatedUser();
    mockUseBilling.mockReturnValue(billingWith("active"));

    render(
      <MemoryRouter>
        <PlanGuard>
          <div data-testid="paid">Contenu payant</div>
        </PlanGuard>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("paid")).toBeInTheDocument();
  });

  it.each(["inactive", "pending_payment"])(
    "autorise le site lorsque l'abonnement est %s",
    (status) => {
      mockAuthenticatedUser();
      mockUseBilling.mockReturnValue(billingWith(status));

      render(
        <MemoryRouter>
          <PlanGuard>
            <div data-testid="pending-access">Dashboard</div>
          </PlanGuard>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("pending-access")).toBeInTheDocument();
    },
  );

  it("redirige vers upgrade lorsque plan free ou absent", () => {
    mockAuthenticatedUser();
    mockUseBilling.mockReturnValue(billingWith("active", "free"));

    render(
      <MemoryRouter initialEntries={["/x"]}>
        <Routes>
          <Route
            path="/x"
            element={
              <PlanGuard>
                <div>Payant</div>
              </PlanGuard>
            }
          />
          <Route path="/upgrade" element={<div data-testid="up">Upgrade</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("up")).toBeInTheDocument();
  });
});
