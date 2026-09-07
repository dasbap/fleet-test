import { describe, expect, it } from "vitest";
import fs from "node:fs";

const formSource = fs.readFileSync("src/components/landing/ContactDemoForm.tsx", "utf8");
const callbackSource = fs.readFileSync("src/features/auth/screens/AuthCallbackPage.tsx", "utf8");

describe("demo email verification flow", () => {
  it("envoie la demande de verification via le BFF et conserve le brouillon", () => {
    expect(formSource).toContain('fetch("/api/demo/verification-email"');
    expect(formSource).toContain('esamba_demo_verification_draft');
    expect(formSource).toContain('body: JSON.stringify({ email })');
  });

  it("verifie le code OTP a 6 chiffres cote client", () => {
    expect(formSource).toContain('verifyOtp({ email, token, type: "email" })');
    expect(formSource).toContain('/^\\d{6}$/');
    expect(formSource).toContain('setEmailVerificationToken(data.session.access_token)');
  });

  it("redirige une verification demo legacy vers contact et non post-login", () => {
    expect(callbackSource).toContain('demo_verification_pending !== true');
    expect(callbackSource).toContain('ROUTE_PATHS.contact}?demo_request_sent=1');
    expect(callbackSource).toContain('DEMO_VERIFICATION_INTENT_KEY');
    expect(callbackSource).toContain('await supabase.auth.signOut({ scope: "local" })');
  });

  it("reprend une session verifiee et restaure le formulaire", () => {
    expect(formSource).toContain('supabase.auth.getSession()');
    expect(formSource).toContain('setEmailVerificationToken(data.session.access_token)');
    expect(formSource).toContain('setForm(draft)');
    expect(formSource).toContain('await supabase.auth.signOut({ scope: "local" })');
  });
});
