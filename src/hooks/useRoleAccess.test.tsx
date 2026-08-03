import { render, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const { mockUseAuth, mockUseDemoSession, mockIsPlatformAdmin, mockIsPlatformSuperAdmin } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseDemoSession: vi.fn(),
  mockIsPlatformAdmin: vi.fn(),
  mockIsPlatformSuperAdmin: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useDemoSession", () => ({
  useDemoSession: () => mockUseDemoSession(),
}));

vi.mock("@/services/admin-profile.service", () => ({
  AdminProfileService: vi.fn().mockImplementation(() => ({
    isPlatformAdmin: (...args: unknown[]) => mockIsPlatformAdmin(...args),
    isPlatformSuperAdmin: (...args: unknown[]) => mockIsPlatformSuperAdmin(...args),
  })),
}));

vi.mock("@/repositories/admin-profile.repository", () => ({
  AdminProfileRepository: vi.fn(),
}));

describe("useRoleAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "admin-1" },
      role: null,
      userFleetId: null,
      memberships: [],
      activeTenantContext: null,
    });
    mockUseDemoSession.mockReturnValue({ isDemo: false });
    mockIsPlatformAdmin.mockResolvedValue(true);
    mockIsPlatformSuperAdmin.mockResolvedValue(false);
  });

  it("reutilise le cache admin sans repasser en chargement au remontage", async () => {
    const first = renderHook(() => useRoleAccess());

    await waitFor(() => {
      expect(first.result.current.isLoading).toBe(false);
    });
    expect(first.result.current.isAdmin).toBe(true);
    first.unmount();

    const renders: boolean[] = [];
    function Probe() {
      renders.push(useRoleAccess().isLoading);
      return null;
    }
    render(<Probe />);

    expect(renders[0]).toBe(false);
  });
});
