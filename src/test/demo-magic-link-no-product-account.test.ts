import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Demo email verification", () => {
  const callbackSource = readFileSync(
    "src/features/auth/screens/AuthCallbackPage.tsx",
    "utf8",
  );
  const routeSource = readFileSync(
    "src/server/http/routes/demoRequest.ts",
    "utf8",
  );
  const formSource = readFileSync(
    "src/components/landing/ContactDemoForm.tsx",
    "utf8",
  );

  it("valide le magic link puis revient au formulaire hors onboarding", () => {
    expect(callbackSource).toContain("exchangeCodeForSession(code)");
    expect(callbackSource).toContain("demo_email_verified=1");
    expect(callbackSource).not.toContain('fetch("/api/demo/request"');
    expect(callbackSource).not.toContain("ROUTE_PATHS.tenantBootstrap");
    expect(callbackSource).not.toContain('navigate("/start"');
  });

  it("supprime uniquement l'identité Auth transitoire après la demande", () => {
    expect(routeSource).toContain(
      "user.user_metadata?.demo_verification_pending !== true",
    );
    expect(routeSource).toContain("user.email_confirmed_at");
    expect(routeSource).toContain('admin.from("demo_requests").insert');
    expect(routeSource).toContain("admin.auth.admin.deleteUser(user.id)");
    expect(routeSource.indexOf('admin.from("demo_requests").insert')).toBeLessThan(
      routeSource.lastIndexOf("admin.auth.admin.deleteUser(user.id)"),
    );
  });

  it("conserve les données du formulaire avant de demander le magic link", () => {
    expect(formSource).toContain("DEMO_VERIFICATION_DRAFT_KEY");
    expect(formSource).toContain("supabase.auth.signInWithOtp");
    expect(formSource).toContain("supabase.auth.onAuthStateChange");
    expect(formSource).toContain(
      "Aucun compte E-Samba n'est créé à ce stade",
    );
  });
});
