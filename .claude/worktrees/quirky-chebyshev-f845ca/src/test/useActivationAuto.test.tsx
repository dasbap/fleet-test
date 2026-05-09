import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useActivation } from "@/hooks/useActivation";

const useAuthMock = vi.fn();
const useOnboardingMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/hooks/useOnboarding", () => ({
  useOnboarding: (...args: unknown[]) => useOnboardingMock(...args),
}));

describe("useActivation (auto)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T10:00:00.000Z"));
    window.localStorage.clear();
    useAuthMock.mockReturnValue({
      user: { id: "user-1", created_at: "2026-04-12T10:00:00.000Z" },
      orgId: "org-1",
    });
    useOnboardingMock.mockReturnValue({
      data: { step: 2, completed: false },
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("calcule progression depuis onboarding", () => {
    const { result } = renderHook(() => useActivation());
    expect(result.current.totalCount).toBe(5);
    expect(result.current.completedCount).toBe(2);
    expect(result.current.percentage).toBe(40);
    expect(result.current.isAllDone).toBe(false);
    expect(result.current.steps.find((step) => !step.completed)?.id).toBe("first_alert");
  });

  it("masque le bandeau hors fenêtre d’activation", () => {
    useAuthMock.mockReturnValue({
      user: { id: "user-1", created_at: "2026-03-01T10:00:00.000Z" },
      orgId: "org-1",
    });
    const { result } = renderHook(() => useActivation());
    expect(result.current.isBannerVisible).toBe(false);
  });

  it("persiste la fermeture et masque immediatement", () => {
    const { result } = renderHook(() => useActivation());
    expect(result.current.isBannerVisible).toBe(true);
    act(() => {
      result.current.dismissBanner();
    });
    expect(window.localStorage.getItem("esamba.activation_banner_dismissed_user-1")).toBe("1");
    expect(result.current.isBannerVisible).toBe(false);
  });
});
