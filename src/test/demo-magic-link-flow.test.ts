import { describe, expect, it } from "vitest";
import fs from "node:fs";

const formSource = fs.readFileSync("src/components/landing/ContactDemoForm.tsx", "utf8");
const callbackSource = fs.readFileSync("src/features/auth/screens/AuthCallbackPage.tsx", "utf8");
const templateSource = fs.readFileSync("supabase/templates/magic_link.html", "utf8");

describe("demo email verification flow", () => {
  it("demande le magic link directement a Supabase et conserve le brouillon", () => {
    expect(formSource).toContain("supabase.auth.signInWithOtp");
    expect(formSource).toContain("esamba_demo_verification_draft");
    expect(formSource).toContain("shouldCreateUser: true");
    expect(formSource).toContain('window.localStorage.setItem(DEMO_VERIFICATION_INTENT_KEY, "demo")');
  });

  it("envoie un magic link avec redirect vers le callback", () => {
    expect(formSource).toContain("emailRedirectTo");
    expect(formSource).toContain("/auth/callback?intent=demo");
    expect(templateSource).toContain("{{ .ConfirmationURL }}");
    expect(templateSource).not.toContain("{{ .Token }}");
  });

  it("le callback valide la session puis revient au formulaire sans soumettre automatiquement", () => {
    expect(callbackSource).toContain("exchangeCodeForSession(code)");
    expect(callbackSource).toContain("setSession({");
    expect(callbackSource).toContain("demo_email_verified=1");
    expect(callbackSource).not.toContain('fetch("/api/demo/request"');
    expect(callbackSource).not.toContain("demo_request_sent=1");
  });

  it("le formulaire attend la session Supabase verifiee", () => {
    expect(formSource).toContain("supabase.auth.onAuthStateChange");
    expect(formSource).toContain("supabase.auth.getSession()");
    expect(formSource).toContain("email_confirmed_at");
    expect(formSource).toContain("setEmailVerificationToken(session.access_token)");
    expect(formSource).toContain("Cette page détectera automatiquement la confirmation Supabase");
  });

  it("demande de reessayer si Supabase limite l'envoi", () => {
    expect(formSource).toContain("Supabase limite temporairement l'envoi des e-mails");
    expect(formSource).toContain("Réessayez dans quelques minutes");
  });
});
