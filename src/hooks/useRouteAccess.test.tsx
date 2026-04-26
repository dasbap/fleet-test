import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRouteAccess } from "@/hooks/useRouteAccess";

const mockUseAuth = vi.fn();
const mockUseBilling = vi.fn();
const mockUseFleetBillingContext = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useBilling", () => ({
  useBilling: (...args: unknown[]) => mockUseBilling(...args),
}));

vi.mock("@/hooks/useFleetBillingContext", () => ({
  useFleetBillingContext: (...args: unknown[]) => mockUseFleetBillingContext(...args),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/lib/authMode", () => ({
  isMockAuthEnabled: () => false,
}));

describe("useRouteAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBilling.mockReturnValue({
      isLoading: false,
      isPending: false,
      data: { lapsedPaid: false, subscription: null, recentPayments: [] },
    });
    mockUseFleetBillingContext.mockReturnValue({
      isLoading: false,
      isPending: false,
      data: {
        planCode: "free",
        isPaid: false,
        vehicleCount: 0,
        maxVehicles: 3,
        financeEnabled: false,
        aiEnabled: false,
        reportsEnabled: false,
        driverScoringEnabled: false,
        anomalyInsightsEnabled: false,
      },
    });
    mockUseQuery.mockReturnValue({
      isLoading: false,
      isPending: false,
      isError: false,
      data: false,
    });
  });

  it("redirige vers onboarding pour première connexion admin", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "u1",
        created_at: "2026-04-25T10:00:00.000Z",
      },
      session: {
        user: { last_sign_in_at: "2026-04-25T10:00:10.000Z" },
      },
      orgId: "o1",
      memberships: [{ id: "m1", fleet_id: "f1", role: "organizer", is_active: true }],
      activeTenantContext: {
        orgId: "o1",
        fleetId: "f1",
        role: "organizer",
      },
      isLoading: false,
      isTenantOrgLoading: false,
    });

    const { result } = renderHook(() => useRouteAccess());
    expect(result.current).toEqual({ state: "onboarding", orgId: "o1" });
  });

  it("redirige vers upgrade si le plan est expiré", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "u1",
        created_at: "2026-04-20T10:00:00.000Z",
      },
      session: {
        user: { last_sign_in_at: "2026-04-25T10:00:00.000Z" },
      },
      orgId: "o1",
      memberships: [{ id: "m1", fleet_id: "f1", role: "manager", is_active: true }],
      activeTenantContext: {
        orgId: "o1",
        fleetId: "f1",
        role: "manager",
      },
      isLoading: false,
      isTenantOrgLoading: false,
    });
    mockUseQuery.mockReturnValue({
      isLoading: false,
      isPending: false,
      isError: false,
      data: true,
    });
    mockUseBilling.mockReturnValue({
      isLoading: false,
      isPending: false,
      data: { lapsedPaid: true, subscription: null, recentPayments: [] },
    });
    mockUseFleetBillingContext.mockReturnValue({
      isLoading: false,
      isPending: false,
      data: {
        planCode: "pro",
        isPaid: true,
        vehicleCount: 10,
        maxVehicles: 50,
        financeEnabled: true,
        aiEnabled: true,
        reportsEnabled: true,
        driverScoringEnabled: true,
        anomalyInsightsEnabled: true,
      },
    });

    const { result } = renderHook(() => useRouteAccess());
    expect(result.current).toEqual({ state: "upgrade", orgId: "o1" });
  });

  it("n'impose pas l'onboarding pour un rôle terrain", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "u1",
        created_at: "2026-04-25T10:00:00.000Z",
      },
      session: {
        user: { last_sign_in_at: "2026-04-25T10:00:05.000Z" },
      },
      orgId: "o1",
      memberships: [{ id: "m1", fleet_id: "f1", role: "driver", is_active: true }],
      activeTenantContext: {
        orgId: "o1",
        fleetId: "f1",
        role: "driver",
      },
      isLoading: false,
      isTenantOrgLoading: false,
    });
    mockUseQuery.mockReturnValue({
      isLoading: false,
      isPending: false,
      isError: false,
      data: false,
    });

    const { result } = renderHook(() => useRouteAccess());
    expect(result.current).toEqual({ state: "ready", orgId: "o1" });
  });
});
