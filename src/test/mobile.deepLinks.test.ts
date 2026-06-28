import { describe, expect, it } from "vitest";
import {
  MOBILE_CRITICAL_ROUTES,
  tryParseMobileCustomSchemePath,
} from "@/mobile/deepLinks";

describe("mobile/deepLinks", () => {
  it("résout esamba://auth/callback avec query PKCE", () => {
    const path = tryParseMobileCustomSchemePath(
      "esamba://auth/callback?code=abc&type=pkce",
    );
    expect(path).toBe(`${MOBILE_CRITICAL_ROUTES.authCallback}?code=abc&type=pkce`);
  });

  it("résout esamba://auth/update-password recovery", () => {
    const path = tryParseMobileCustomSchemePath(
      "esamba://auth/update-password?token_hash=xyz&type=recovery",
    );
    expect(path).toBe(
      `${MOBILE_CRITICAL_ROUTES.updatePassword}?token_hash=xyz&type=recovery`,
    );
  });

  it("résout com.esamba.flotte://dashboard", () => {
    expect(tryParseMobileCustomSchemePath("com.esamba.flotte://dashboard")).toBe(
      MOBILE_CRITICAL_ROUTES.dashboard,
    );
  });

  it("résout esamba://onboarding", () => {
    expect(tryParseMobileCustomSchemePath("esamba://onboarding")).toBe(
      MOBILE_CRITICAL_ROUTES.onboarding,
    );
  });

  it("résout esamba://create-fleet", () => {
    expect(tryParseMobileCustomSchemePath("esamba://create-fleet")).toBe(
      MOBILE_CRITICAL_ROUTES.createFleet,
    );
  });

  it("ignore un schéma non supporté", () => {
    expect(tryParseMobileCustomSchemePath("https://www.e-samba.com/dashboard")).toBeNull();
  });
});
