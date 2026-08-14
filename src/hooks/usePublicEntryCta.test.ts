import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { LANDING_CTA } from "@/config/navigation";
import { usePublicEntryCta } from "./usePublicEntryCta";

const authState = vi.hoisted(() => ({
  value: null as null | { user: unknown; role: "organizer" | "driver" | null },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuthOptional: () => authState.value,
}));

describe("usePublicEntryCta", () => {
  it("renvoie le CTA public pour un visiteur", () => {
    authState.value = null;

    const { result } = renderHook(() => usePublicEntryCta());

    expect(result.current).toEqual({
      href: LANDING_CTA.signupHref,
      label: LANDING_CTA.signupLabel,
      isAuthenticated: false,
    });
  });

  it("renvoie le dashboard quand une session est active", () => {
    authState.value = { user: { id: "user-1" }, role: "organizer" };

    const { result } = renderHook(() => usePublicEntryCta());

    expect(result.current).toEqual({
      href: ROUTE_PATHS.dashboard,
      label: "Dashboard",
      isAuthenticated: true,
    });
  });

  it("respecte le point d'entree du role connecte", () => {
    authState.value = { user: { id: "driver-1" }, role: "driver" };

    const { result } = renderHook(() => usePublicEntryCta());

    expect(result.current.href).toBe(ROUTE_PATHS.terrain);
    expect(result.current.label).toBe("Dashboard");
  });
});
