import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Supabase auth link contract", () => {
  it("route tous les resets de mot de passe vers la page recovery compatible Supabase", () => {
    const sources = [
      "api/admin/create-user.ts",
      "src/server/http/routes/adminProspectSecurity.ts",
      "supabase/functions/create-prospect-account/index.ts",
      "supabase/functions/create-fleet-member-account/index.ts",
    ].map(read);

    for (const source of sources) {
      expect(source).toContain("resetPasswordForEmail");
      expect(source).toContain("/auth/update-password");
      expect(source).not.toContain('redirectTo: `${APP_URL.replace(/\\/$/, "")}/set-password`');
      expect(source).not.toContain("/set-password");
    }
  });

  it("garde les magic links standards sur le callback PKCE", () => {
    expect(read("src/features/auth/hooks/useMagicLink.ts")).toContain(
      "getAuthRedirectUrl(ROUTE_PATHS.authCallback)",
    );
    expect(read("src/features/auth/screens/AuthCallbackPage.tsx")).toContain(
      "exchangeCodeForSession(code)",
    );
  });

  it("garde le reset public sur update-password avec verifyOtp recovery", () => {
    expect(read("src/features/auth/hooks/usePasswordReset.ts")).toContain(
      "getAuthRedirectUrl(ROUTE_PATHS.updatePassword)",
    );
    const page = read("src/features/auth/screens/UpdatePasswordPage.tsx");
    expect(page).toContain('type === "recovery"');
    expect(page).toContain("supabase.auth.verifyOtp");
    expect(page).toContain("/api/auth/clear-password-marker");
  });

  it("supporte le magic link demo sur /demo/onboarding", () => {
    const route = read("src/server/http/routes/adminDemo.ts");
    const onboarding = read("src/features/demo/ProspectOnboarding.tsx");
    expect(route).toContain("/demo/onboarding");
    expect(onboarding).toContain("exchangeCodeForSession(code)");
    expect(onboarding).toContain("readHashSession()");
  });

  it("autorise explicitement les destinations web de production dans Supabase", () => {
    const config = read("supabase/config.toml");
    for (const url of [
      "https://fleet-test-gamma.vercel.app/**",
      "https://fleet-test-gamma.vercel.app/auth/callback",
      "https://fleet-test-gamma.vercel.app/auth/update-password",
      "https://fleet-test-gamma.vercel.app/demo/onboarding",
      "https://www.e-samba.com/**",
      "https://app.e-samba.com/**",
      "https://*.vercel.app/**",
    ]) {
      expect(config).toContain(`"${url}"`);
    }
  });

  it("autorise gamma dans les Edge Functions qui peuvent repondre au navigateur", () => {
    for (const path of [
      "supabase/functions/create-prospect-account/index.ts",
      "supabase/functions/create-fleet-member-account/index.ts",
      "supabase/functions/demo-magic-link/index.ts",
    ]) {
      expect(read(path)).toContain('"https://fleet-test-gamma.vercel.app"');
    }
  });
});
