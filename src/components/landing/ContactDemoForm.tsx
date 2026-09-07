import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, MailCheck } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubmitDemoRequest } from "@/hooks/useSubmitDemoRequest";
import { supabase } from "@/integrations/supabase/client";

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

interface ContactDemoFormProps { className?: string; }

type DemoFormState = {
  name: string;
  email: string;
  company: string;
  phone: string;
  company_identifier: string;
  country_code: string;
};

type VerificationEmailResponse = {
  ok?: boolean;
  queued?: boolean;
  error?: string;
  retry_after_seconds?: number;
};

function mapVerificationError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("rate") || normalized.includes("too many")) {
    return "Trop d'e-mails de vérification ont été demandés. Attendez quelques minutes avant de réessayer.";
  }
  if (normalized.includes("expired") || normalized.includes("invalid") || normalized.includes("token")) {
    return "Le lien de vérification est invalide ou expiré. Demandez un nouvel e-mail E-Samba.";
  }
  if (normalized.includes("fetch") || normalized.includes("network")) {
    return "Impossible de joindre le service de vérification E-Samba. Vérifiez votre connexion et réessayez.";
  }
  console.error("[E-Samba] Erreur vérification email démo", error);
  return "Le service de vérification e-mail E-Samba n'est pas disponible sur cet environnement. Réessayez plus tard.";
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
  const [verificationQueued, setVerificationQueued] = useState(false);
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
      setSent(true);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const savedDraft = readSavedDraft();
    if (savedDraft) {
      setForm(savedDraft);
      const savedEmailState = window.localStorage.getItem(DEMO_VERIFICATION_EMAIL_STATE_KEY);
      if (savedEmailState === "sent" || savedEmailState === "queued" || savedEmailState === "verified") {
        setVerificationEmailSent(true);
        setVerificationQueued(savedEmailState === "queued");
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
      setVerificationQueued(false);
      setFormError(null);
      window.localStorage.removeItem(DEMO_VERIFICATION_INTENT_KEY);
      window.localStorage.setItem(DEMO_VERIFICATION_EMAIL_STATE_KEY, "verified");
    };

    const refreshSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error) applySession(data.session);
    };

    void refreshSession();
    const interval = window.setInterval(() => void refreshSession(), 1500);
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      listener.subscription.unsubscribe();
    };
  }, [emailVerified, form.email, verificationEmailSent]);

  function updateEmail(email: string) {
    setForm((current) => ({ ...current, email }));
    setVerificationEmailSent(false);
    setVerificationQueued(false);
    setEmailVerified(false);
    setEmailVerificationToken("");
    window.localStorage.removeItem(DEMO_VERIFICATION_EMAIL_STATE_KEY);
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

    setVerificationPending(true);
    try {
      window.localStorage.setItem(DEMO_VERIFICATION_DRAFT_KEY, JSON.stringify({ ...form, email }));
      window.localStorage.setItem(DEMO_VERIFICATION_INTENT_KEY, "demo");

      const response = await fetch("/api/demo/verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      let body: VerificationEmailResponse = {};
      try {
        body = (await response.json()) as VerificationEmailResponse;
      } catch {
        body = {};
      }

      if (response.status === 429 && body.error === "email_cooldown") {
        const seconds = Math.max(1, body.retry_after_seconds ?? 180);
        const minutes = Math.ceil(seconds / 60);
        setVerificationEmailSent(true);
        setVerificationQueued(false);
        window.localStorage.setItem(DEMO_VERIFICATION_EMAIL_STATE_KEY, "sent");
        setFormError(`Un e-mail a déjà été envoyé à cette adresse. Vous pourrez en demander un autre dans environ ${minutes} min.`);
        return;
      }

      if (!response.ok && response.status !== 202) {
        throw new Error(body.error ?? "verification_email_failed");
      }

      setVerificationEmailSent(true);
      setVerificationQueued(body.queued === true || response.status === 202);
      setEmailVerified(false);
      setEmailVerificationToken("");
      window.localStorage.setItem(
        DEMO_VERIFICATION_EMAIL_STATE_KEY,
        body.queued === true || response.status === 202 ? "queued" : "sent",
      );
    } catch (error) {
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
      await submitDemoRequest.mutateAsync({
        name: form.name,
        email: form.email,
        company: form.company,
        phone: form.phone,
        companyIdentifier: form.company_identifier,
        countryCode: form.country_code,
        emailVerificationToken,
      });
      setEmailVerificationToken("");
      window.localStorage.removeItem(DEMO_VERIFICATION_DRAFT_KEY);
      window.localStorage.removeItem(DEMO_VERIFICATION_INTENT_KEY);
      window.localStorage.removeItem(DEMO_VERIFICATION_EMAIL_STATE_KEY);
      await supabase.auth.signOut({ scope: "local" });
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
            <Button type="button" variant="outline" onClick={() => void sendVerificationEmail()} disabled={verificationPending || emailVerified || verificationQueued}>{emailVerified ? "Vérifiée" : verificationQueued ? "En attente" : verificationEmailSent ? "Renvoyer" : "Vérifier"}</Button>
          </div>
          {emailVerified ? <p className="flex items-center gap-1 text-xs text-primary"><MailCheck className="h-3.5 w-3.5" />Adresse e-mail vérifiée par E-Samba.</p> : null}
        </div>

        {verificationEmailSent && !emailVerified ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
            <p className="font-medium">{verificationQueued ? "Demande placée en liste d'attente" : "En attente de votre confirmation"}</p>
            <p className="text-xs text-muted-foreground">{verificationQueued ? `Le quota quotidien d'e-mails est atteint. ${form.email.trim()} recevra automatiquement son lien de vérification dès que le quota sera de nouveau disponible.` : `E-Samba a envoyé un lien à ${form.email.trim()}. Cliquez sur ce lien pour vérifier l'adresse. Cette page détectera automatiquement la confirmation Supabase.`}</p>
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