import { describe, it, expect, vi, beforeEach } from "vitest";
import { isMockAuthEnabled } from "@/lib/authMode";
import { getLoginPathPreservingReturn } from "./loginRedirectPath";
import { POST_LOGIN_NEXT_PARAM } from "@/navigation/postLoginRedirect";

vi.mock("@/lib/authMode", () => ({
  isMockAuthEnabled: vi.fn(() => false),
}));

describe("getLoginPathPreservingReturn", () => {
  beforeEach(() => {
    vi.mocked(isMockAuthEnabled).mockReturnValue(false);
  });

  it("ajoute next sur /auth lorsque la cible est une route métier", () => {
    expect(
      getLoginPathPreservingReturn({
        pathname: "/dashboard/vehicles/x",
        search: "?tab=a",
      }),
    ).toBe(
      `/auth?${POST_LOGIN_NEXT_PARAM}=${encodeURIComponent("/dashboard/vehicles/x?tab=a")}`,
    );
  });

  it("ne boucle pas depuis /auth", () => {
    expect(
      getLoginPathPreservingReturn({ pathname: "/auth", search: "?mode=signup" }),
    ).toBe("/auth");
  });

  it("utilise /login en session mockée", () => {
    vi.mocked(isMockAuthEnabled).mockReturnValue(true);
    expect(
      getLoginPathPreservingReturn({ pathname: "/dashboard", search: "" }),
    ).toBe(`/login?${POST_LOGIN_NEXT_PARAM}=%2Fdashboard`);
  });
});
