import { describe, expect, it } from "vitest";
import fs from "node:fs";

const formSource = fs.readFileSync("src/components/landing/ContactDemoForm.tsx", "utf8");
const callbackSource = fs.readFileSync("src/features/auth/screens/AuthCallbackPage.tsx", "utf8");

describe("demo magic-link verification flow", () => {
  it("envoie le lien Supabase vers le callback avec l'intention demo", () => {
    expect(formSource).toContain("emailRedirectTo: redirectTo");
    expect(formSource).toContain('/auth/callback?intent=demo');
    expect(formSource).toContain('esamba_demo_verification_draft');
  });

  it("redirige une verification demo vers contact et non post-login", () => {
    expect(callbackSource).toContain('demo_verification_pending !== true');
    expect(callbackSource).toContain('ROUTE_PATHS.contact}?demo_request_sent=1');
    expect(callbackSource).toContain('DEMO_VERIFICATION_INTENT_KEY');
    expect(callbackSource).toContain('await supabase.auth.signOut({ scope: "local" })');
  });

  it("reprend la session verifiee et restaure le formulaire", () => {
    expect(formSource).toContain('supabase.auth.getSession()');
    expect(formSource).toContain('setEmailVerificationToken(data.session.access_token)');
    expect(formSource).toContain('setForm(draft)');
    expect(formSource).toContain('await supabase.auth.signOut({ scope: "local" })');
  });
});
