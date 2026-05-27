import { describe, expect, it } from "vitest";
import {
  resolveIncomingAppUrl,
  tryParseEsambaAuthSpaPath,
  tryParseHttpsAppSpaPath,
} from "@/lib/deepLinks/resolveAppUrl";
import { ROUTE_PATHS } from "@/navigation/routePaths";

describe("resolveAppUrl", () => {
  it("résout esamba://auth/callback avec query PKCE", () => {
    expect(tryParseEsambaAuthSpaPath("esamba://auth/callback?code=abc")).toBe(
      `${ROUTE_PATHS.authCallback}?code=abc`,
    );
    const r = resolveIncomingAppUrl("esamba://auth/callback?code=abc");
    expect(r).toEqual({ kind: "spa", path: `${ROUTE_PATHS.authCallback}?code=abc` });
  });

  it("résout esamba://auth/update-password", () => {
    expect(tryParseEsambaAuthSpaPath("esamba://auth/update-password")).toBe(
      ROUTE_PATHS.updatePassword,
    );
  });

  it("résout https://www.e-samba.com/dashboard/alerts", () => {
    expect(tryParseHttpsAppSpaPath("https://www.e-samba.com/dashboard/alerts")).toBe(
      "/dashboard/alerts",
    );
    const r = resolveIncomingAppUrl("https://www.e-samba.com/dashboard/alerts");
    expect(r).toEqual({ kind: "spa", path: "/dashboard/alerts" });
  });

  it("refuse un chemin HTTPS hors allowlist", () => {
    expect(tryParseHttpsAppSpaPath("https://www.e-samba.com/evil")).toBeNull();
    const r = resolveIncomingAppUrl("https://evil.example.com/dashboard");
    expect(r.kind).toBe("unsupported");
  });

  it("délègue esamba://alerts au deep link métier", () => {
    const r = resolveIncomingAppUrl("esamba://alerts");
    expect(r).toEqual({ kind: "esamba_deep_link", url: "esamba://alerts" });
  });
});
