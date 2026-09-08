import { describe, expect, it } from "vitest";
import fs from "node:fs";

const formSource = fs.readFileSync("src/components/landing/ContactDemoForm.tsx", "utf8");
const callbackSource = fs.readFileSync("src/features/auth/screens/AuthCallbackPage.tsx", "utf8");
const routesSource = fs.readFileSync("src/app/routes/app.routes.tsx", "utf8");
const templateSource = fs.readFileSync("supabase/templates/magic_link.html", "utf8");

describe("demo email verification flow", () => {
  it("demande le magic link directement a Supabase et conserve le brouillon", () => {
    expect(formSource).toContain("demoVerificationSupabase.auth.signInWithOtp");
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

  it("intercepte aussi un callback Supabase retourne sur la racine", () => {
    expect(routesSource).toContain("hasAuthCallbackPayload");
    expect(routesSource).toContain('to={`/auth/callback${location.search}${location.hash}`}');
    expect(routesSource).toContain('hash.get("type") === "magiclink"');
  });

  it("le callback affiche une confirmation avant le retour au formulaire", () => {
    expect(callbackSource).toContain("exchangeCodeForSession(code)");
    expect(callbackSource).toContain("setSession({");
    expect(callbackSource).toContain("Votre adresse a été vérifiée");
    expect(callbackSource).toContain("Retourner sur /contact et demander mon compte");
    expect(callbackSource).toContain("demo_email_verified=1");
    expect(callbackSource).not.toContain('fetch("/api/demo/request"');
  });

  it("synchronise la page contact deja ouverte", () => {
    expect(callbackSource).toContain("BroadcastChannel");
    expect(callbackSource).toContain("esamba_demo_verification");
    expect(formSource).toContain("BroadcastChannel");
    expect(formSource).toContain('window.addEventListener("storage"');
    expect(formSource).toContain("demoVerificationSupabase.auth.getSession()");
    expect(formSource).toContain("email_confirmed_at");
    expect(formSource).toContain("setEmailVerificationToken(session.access_token)");
  });

  it("demande de reessayer si Supabase limite l'envoi", () => {
    expect(formSource).toContain("Supabase limite temporairement l'envoi des e-mails");
    expect(formSource).toContain("Réessayez dans quelques minutes");
  });
});
