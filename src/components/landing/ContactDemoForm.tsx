import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, MailCheck } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubmitDemoRequest } from "@/hooks/useSubmitDemoRequest";
import { demoVerificationSupabase } from "@/integrations/supabase/client";
import { normalizeDemoPhone } from "@/lib/demoPhoneValidation";

const CENTRAL_AFRICA_COUNTRIES = [
  { code: "CM", label: "Cameroun" },
  { code: "CF", label: "Centrafrique" },
  { code: "TD", label: "Tchad" },
  { code: "CG", label: "Congo" },
  { code: "GA", label: "Gabon" },
  { code: "GQ", label: "Guinée équatoriale" },
] as const;

const DEMO_VERIFICATION_DRAFT_KEY = "esamba_demo_verification_draft";
const DEMO_VERIFICATION_INTENT_KEY = "esamba_demo_verification_intent";
const DEMO_VERIFICATION_EMAIL_STATE_KEY = "esamba_demo_verification_email_state";
const DEMO_VERIFICATION_EVENT_KEY = `${DEMO_VERIFICATION_EMAIL_STATE_KEY}_event`;
const DEMO_VERIFICATION_BROADCAST_CHANNEL = "esamba_demo_verification";

interface ContactDemoFormProps { className?: string; }

type DemoFormState = {
  name: string;
  email: string;
  company: string;
  phone: string;
  company_identifier: string;
  country_code: string;
};

function mapVerificationError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();
  if (
    normalized.includes("rate") ||
    normalized.includes("too many") ||
    normalized.includes("email rate limit") ||
    normalized.includes("over_email_send_rate_limit")
  ) {
    return "Supabase limite temporairement l'envoi des e-mails. Réessayez dans quelques minutes.";
  }
  if (normalized.includes("fetch") || normalized.includes("network")) {
    return "Impossible de joindre Supabase. Vérifiez votre connexion et réessayez dans quelques minutes.";
  }
  console.error("[E-Samba] Erreur vérification email démo", error);
  return "Supabase n'a pas pu envoyer l'e-mail de vérification. Réessayez dans quelques minutes.";
}

function readSavedDraft(): DemoFormState | null {
  try {
    const raw = window.localStorage.getItem(DEMO_VERIFICATION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoFormState>;
    if (!parsed.email) return null;
    return {
      name: parsed.name ?? "",
      email: parsed.email ?? "",
      company: parsed.company ?? "",
      phone: parsed.phone ?? "",
      company_identifier: parsed.company_identifier ?? "",
      country_code: parsed.country_code ?? "",
    };
  } catch {
    return null;
  }
}

function isMatchingVerifiedDemoSession(session: Session | null, email: string): session is Session {
  if (!session?.user?.email || !session.user.email_confirmed_at) return false;
  if (session.user.email.toLowerCase() !== email.trim().toLowerCase()) return false;
  return session.user.user_metadata?.demo_verification_pending === true;
}

export function ContactDemoForm({ className }: ContactDemoFormProps) {
  const [form, setForm] = useState<DemoFormState>({ name: "", email: "", company: "", phone: "", company_identifier: "", country_code: "" });
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submitDemoRequest = useSubmitDemoRequest();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo_request_sent") === "1") {
      window.localStorage.removeItem(DEMO_VERIFICATION_DRAFT_KEY);
      window.localStorage.removeItem(DEMO_VERIFICATION_INTENT_KEY);
      window.localStorage.removeItem(DEMO_VERIFICATION_EMAIL_STATE_KEY);
      window.localStorage.removeItem(DEMO_VERIFICATION_EVENT_KEY);
      setSent(true);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const savedDraft = readSavedDraft();
    if (savedDraft) {
      setForm(savedDraft);
      const savedEmailState = window.localStorage.getItem(DEMO_VERIFICATION_EMAIL_STATE_KEY);
      if (savedEmailState === "sent" || savedEmailState === "verified") {
        setVerificationEmailSent(true);
      }
    }

    if (params.get("demo_email_verified") === "1") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!verificationEmailSent || emailVerified || !form.email.trim()) return;

    let cancelled = false;
    const email = form.email.trim().toLowerCase();

    const applySession = (session: Session | null) => {
      if (cancelled || !isMatchingVerifiedDemoSession(session, email)) return;
      setEmailVerificationToken(session.access_token);
      setEmailVerified(true);
      setVerificationEmailSent(true);
      setFormError(null);
      window.localStorage.removeItem(DEMO_VERIFICATION_INTENT_KEY);
      window.localStorage.setItem(DEMO_VERIFICATION_EMAIL_STATE_KEY, "verified");
    };

    const refreshSession = async () => {
      const { data, error } = await demoVerificationSupabase.auth.getSession();
      if (!error) applySession(data.session);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === DEMO_VERIFICATION_EMAIL_STATE_KEY || event.key === DEMO_VERIFICATION_EVENT_KEY) {
        void refreshSession();
      }
    };

    void refreshSession();
    const interval = window.setInterval(() => void refreshSession(), 1500);
    const { data: listener } = demoVerificationSupabase.auth.onAuthStateChange((_event, session) => applySession(session));
    window.addEventListener("storage", handleStorage);

    const channel = typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(DEMO_VERIFICATION_BROADCAST_CHANNEL)
      : null;
    if (channel) {
      channel.onmessage = (event) => {
        const payload = event.data as { type?: string; email?: string } | null;
        if (payload?.type === "verified" && payload.email?.toLowerCase() === email) {
          void refreshSession();
        }
      };
    }

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      listener.subscription.unsubscribe();
      window.removeEventListener("storage", handleStorage);
      channel?.close();
    };
  }, [emailVerified, form.email, verificationEmailSent]);

  function updateEmail(email: string) {
    setForm((current) => ({ ...current, email }));
    setVerificationEmailSent(false);
    setEmailVerified(false);
    setEmailVerificationToken("");
    window.localStorage.removeItem(DEMO_VERIFICATION_EMAIL_STATE_KEY);
    window.localStorage.removeItem(DEMO_VERIFICATION_EVENT_KEY);
  }

  async function sendVerificationEmail() {
    setFormError(null);
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Renseignez une adresse e-mail valide.");
      return;
    }
    if (!form.name.trim() || !form.company.trim() || !form.phone.trim() || !form.company_identifier.trim() || !form.country_code) {
      setFormError("Complétez tous les champs avant de vérifier votre adresse e-mail.");
      return;
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeDemoPhone(form.phone, form.country_code);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Numéro de téléphone invalide.");
      return;
    }

    setVerificationPending(true);
    try {
      const nextForm = { ...form, email, phone: normalizedPhone };
      setForm(nextForm);
      window.localStorage.setItem(DEMO_VERIFICATION_DRAFT_KEY, JSON.stringify(nextForm));
      window.localStorage.setItem(DEMO_VERIFICATION_INTENT_KEY, "demo");

      const { error } = await demoVerificationSupabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?intent=demo`,
          data: { demo_verification_pending: true },
        },
      });

      if (error) throw error;

      setVerificationEmailSent(true);
      setEmailVerified(false);
      setEmailVerificationToken("");
      window.localStorage.setItem(DEMO_VERIFICATION_EMAIL_STATE_KEY, "sent");
    } catch (error) {
      setVerificationEmailSent(false);
      window.localStorage.removeItem(DEMO_VERIFICATION_EMAIL_STATE_KEY);
      setFormError(mapVerificationError(error));
    } finally {
      setVerificationPending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!emailVerified || !emailVerificationToken) {
      setFormError("Cliquez sur le lien reçu par e-mail et attendez la confirmation E-Samba avant d'envoyer la demande.");
      return;
    }
    try {
      const normalizedPhone = normalizeDemoPhone(form.phone, form.country_code);
      await submitDemoRequest.mutateAsync({
        name: form.name,
        email: form.email,
        company: form.company,
        phone: normalizedPhone,
        companyIdentifier: form.company_identifier,
        countryCode: form.country_code,
        emailVerificationToken,
      });
      setEmailVerificationToken("");
      window.localStorage.removeItem(DEMO_VERIFICATION_DRAFT_KEY);
      window.localStorage.removeItem(DEMO_VERIFICATION_INTENT_KEY);
      window.localStorage.removeItem(DEMO_VERIFICATION_EMAIL_STATE_KEY);
      window.localStorage.removeItem(DEMO_VERIFICATION_EVENT_KEY);
      await demoVerificationSupabase.auth.signOut({ scope: "local" });
      setSent(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Impossible d'envoyer la demande.");
    }
  }

  if (sent) {
    return <div className={className}><div className="py-8 text-center"><CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" /><h3 className="mb-2 text-xl font-heading font-bold">Demande envoyée !</h3><p className="text-sm text-muted-foreground">Votre adresse e-mail a été vérifiée et votre demande est transmise aux admins. Aucun compte E-Samba n'est créé à ce stade. Le compte sera créé uniquement si un administrateur accepte votre demande.</p></div></div>;
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className={className}>
      <h3 className="mb-6 text-xl font-heading font-bold">Planifier ma démo gratuite</h3>
      <div className="space-y-4">
        <div><Label htmlFor="demo-name">Nom complet *</Label><Input id="demo-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Jean Dupont" className="mt-1" /></div>
        <div><Label htmlFor="demo-company">Entreprise *</Label><Input id="demo-company" required value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="TransCam SARL" className="mt-1" /></div>
        <div className="space-y-2">
          <Label htmlFor="demo-email">Adresse mail *</Label>
          <div className="flex gap-2">
            <Input id="demo-email" required type="email" autoComplete="email" value={form.email} onChange={(event) => updateEmail(event.target.value)} placeholder="vous@entreprise.com" disabled={emailVerified} />
            <Button type="button" variant="outline" onClick={() => void sendVerificationEmail()} disabled={verificationPending || emailVerified}>{emailVerified ? "Vérifiée" : verificationEmailSent ? "Renvoyer" : "Vérifier"}</Button>
          </div>
          {emailVerified ? <p className="flex items-center gap-1 text-xs text-primary"><MailCheck className="h-3.5 w-3.5" />Adresse e-mail vérifiée par E-Samba. Vous pouvez demander votre compte.</p> : null}
        </div>

        {verificationEmailSent && !emailVerified ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
            <p className="font-medium">En attente de votre confirmation</p>
            <p className="text-xs text-muted-foreground">E-Samba a demandé à Supabase d'envoyer un lien à {form.email.trim()}. Cliquez sur ce lien pour vérifier l'adresse. Cette page se mettra automatiquement à jour, même si vous ouvrez le lien dans un autre onglet.</p>
          </div>
        ) : null}

        <div><Label htmlFor="demo-phone">Téléphone *</Label><Input id="demo-phone" required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+237 6 XX XX XX XX" className="mt-1" /></div>
        <div><Label htmlFor="demo-company-identifier">Numéro d'identifiant entreprise *</Label><Input id="demo-company-identifier" required value={form.company_identifier} onChange={(event) => setForm({ ...form, company_identifier: event.target.value })} placeholder="RCCM, NIU, NIF..." className="mt-1" /></div>
        <div><Label htmlFor="demo-country">Pays *</Label><Select value={form.country_code} onValueChange={(value) => setForm({ ...form, country_code: value })}><SelectTrigger id="demo-country" className="mt-1"><SelectValue placeholder="Sélectionnez un pays" /></SelectTrigger><SelectContent>{CENTRAL_AFRICA_COUNTRIES.map((country) => <SelectItem key={country.code} value={country.code}>{country.label}</SelectItem>)}</SelectContent></Select></div>
        {formError ? <p className="text-xs text-destructive" role="alert">{formError}</p> : null}
        <Button type="submit" className="w-full gap-2" disabled={submitDemoRequest.isPending || verificationPending || !emailVerified}>{submitDemoRequest.isPending ? "Envoi..." : "Demander ma démo"}<ArrowRight className="h-4 w-4" /></Button>
      </div>
    </form>
  );
}
