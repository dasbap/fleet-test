import { describe, expect, it } from "vitest";
import {
  AUTH_URL_MODE_PARAM,
  AUTH_URL_MODE_SIGNUP,
  buildAuthHref,
  isAuthSignupMode,
} from "@/navigation/authEntryUrl";
import { ROUTE_PATHS } from "@/navigation/routePaths";

describe("authEntryUrl", () => {
  it("isAuthSignupMode est vrai uniquement pour mode=signup", () => {
    expect(isAuthSignupMode(new URLSearchParams(""))).toBe(false);
    expect(isAuthSignupMode(new URLSearchParams("mode=signup"))).toBe(true);
    expect(isAuthSignupMode(new URLSearchParams("mode=login"))).toBe(false);
  });

  it("buildAuthHref préserve next et bascule mode inscription", () => {
    const base = new URLSearchParams("next=%2Fdashboard%2Fvehicles");
    const out = new URL(buildAuthHref(base, true), "https://local.test");
    expect(out.pathname).toBe(ROUTE_PATHS.auth);
    expect(out.searchParams.get("next")).toBe("/dashboard/vehicles");
    expect(out.searchParams.get(AUTH_URL_MODE_PARAM)).toBe(AUTH_URL_MODE_SIGNUP);
  });

  it("buildAuthHref retire le mode connexion tout en gardant les autres paramètres", () => {
    const withSignup = new URLSearchParams(
      `next=${encodeURIComponent("/alerts")}&${AUTH_URL_MODE_PARAM}=${AUTH_URL_MODE_SIGNUP}`,
    );
    const out = new URL(buildAuthHref(withSignup, false), "https://local.test");
    expect(out.pathname).toBe(ROUTE_PATHS.auth);
    expect(out.searchParams.get("next")).toBe("/alerts");
    expect(out.searchParams.get(AUTH_URL_MODE_PARAM)).toBeNull();
  });

  it("buildAuthHref sans query retourne /auth", () => {
    expect(buildAuthHref(new URLSearchParams(""), false)).toBe(ROUTE_PATHS.auth);
  });
});
