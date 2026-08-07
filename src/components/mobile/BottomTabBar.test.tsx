import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BottomTabBar } from "@/components/mobile/BottomTabBar";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const roleAccessMock = vi.fn(() => ({ isAdmin: false }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ userFleetId: "fleet-1" }),
}));

vi.mock("@/hooks/useRoleAccess", () => ({
  useRoleAccess: () => roleAccessMock(),
}));

vi.mock("@/hooks/useFleetBillingContext", () => ({
  useFleetBillingContext: () => ({
    data: {
      financeEnabled: true,
      reportsEnabled: true,
    },
    isError: false,
  }),
}));

function renderBottomTabs(initialRoute = ROUTE_PATHS.dashboardAdmin) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <BottomTabBar userRole="organizer" />
    </MemoryRouter>,
  );
}

describe("BottomTabBar", () => {
  beforeEach(() => {
    roleAccessMock.mockReturnValue({ isAdmin: false });
  });

  it("masque les actions métier flotte pour un admin plateforme", () => {
    roleAccessMock.mockReturnValue({ isAdmin: true });

    renderBottomTabs();

    expect(screen.getByRole("link", { name: /Admin/i })).toHaveAttribute(
      "href",
      ROUTE_PATHS.dashboardAdmin,
    );
    expect(screen.queryByRole("link", { name: /Alertes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Scanner/i })).not.toBeInTheDocument();
  });
});
