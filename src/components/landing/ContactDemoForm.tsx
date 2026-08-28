import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubmitDemoRequest } from "@/hooks/useSubmitDemoRequest";
import { createEphemeralSupabaseClient, supabase } from "@/integrations/supabase/client";

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
  if (normalized.includes("rate") || normalized.includes("too many")) {
    return "Trop d'e-mails de vérification ont été demandés. Attendez quelques minutes avant de réessayer.";
  }
  if (normalized.includes("expired") || normalized.includes("invalid") || normalized.includes("token")) {
    return "Le lien ou le code de vérification est invalide ou expiré. Demandez un nouvel e-mail E-Samba.";
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

export function ContactDemoForm({ className }: ContactDemoFormProps) {
  const verificationClientRef = useRef<ReturnType<typeof createEphemeralSupabaseClient> | null>(null);
  const [form, setForm] = useState<DemoFormState>({ name: "", email: "", company: "", phone: "", company_identifier: "", country_code: "" });
  const [otp, setOtp] = useState("");
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submitDemoRequest = useSubmitDemoRequest();

  useEffect(() => {
    const savedDraft = readSavedDraft();
    if (savedDraft) {
      setForm(savedDraft);
    }

    const shouldResumeVerification =
      window.localStorage.getItem(DEMO_VERIFICATION_INTENT_KEY) === "demo" ||
      new URLSearchParams(window.location.search).get("demo_email_verified") === "1";

    if (!shouldResumeVerification) return;

    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled || error || !data.session?.user?.email) return;

      const draft = savedDraft ?? readSavedDraft();
      const sessionEmail = data.session.user.email.toLowerCase();
      if (!draft || draft.email.trim().toLowerCase() !== sessionEmail) return;

      if (data.session.user.user_metadata?.demo_verification_pending !== true) {
        setFormError("Cette adresse e-mail est déjà associée à un compte E-Samba.");
        return;
      }

      setForm(draft);
      setEmailVerificationToken(data.session.access_token);
      setEmailVerified(true);
      setVerificationEmailSent(true);
      setFormError(null);
      window.localStorage.removeItem(DEMO_VERIFICATION_INTENT_KEY);
      if (new URLSearchParams(window.location.search).has("demo_email_verified")) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateEmail(email: string) {
    setForm((current) => ({ ...current, email }));
    verificationClientRef.current = null;
    setOtp("");
    setVerificationEmailSent(false);
    setEmailVerified(false);
    setEmailVerificationToken("");
  }

  async function sendVerificationEmail() {
    setFormError(null);
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Renseignez une adresse e-mail valide.");
      return;
    }

    setVerificationPending(true);
    try {
      window.localStorage.setItem(DEMO_VERIFICATION_DRAFT_KEY, JSON.stringify({ ...form, email }));
      window.localStorage.setItem(DEMO_VERIFICATION_INTENT_KEY, "demo");

      const redirectTo = `${window.location.origin}/auth/callback?intent=demo`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo,
          data: { demo_verification_pending: true },
        },
      });
      if (error) throw error;

      setVerificationEmailSent(true);
      setEmailVerified(false);
      setEmailVerificationToken("");
    } catch (error) {
      window.localStorage.removeItem(DEMO_VERIFICATION_INTENT_KEY);
      setFormError(mapVerificationError(error));
    } finally {
      setVerificationPending(false);
    }
  }

  async function verifyEmailCode() {
    setFormError(null);
    const email = form.email.trim().toLowerCase();
    const token = otp.trim();
    if (!/^\d{6}$/.test(token)) {
      setFormError("Saisissez le code E-Samba à 6 chiffres reçu par e-mail.");
      return;
    }

    setVerificationPending(true);
    try {
      const verificationClient = createEphemeralSupabaseClient();
      verificationClientRef.current = verificationClient;
      const { data, error } = await verificationClient.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
      if (!data.user || data.user.email?.toLowerCase() !== email || !data.session?.access_token) {
        throw new Error("invalid_verification_session");
      }
      if (data.user.user_metadata?.demo_verification_pending !== true) {
        throw new Error("Cette adresse e-mail est déjà associée à un compte E-Samba.");
      }
      setEmailVerificationToken(data.session.access_token);
      setEmailVerified(true);
      window.localStorage.removeItem(DEMO_VERIFICATION_INTENT_KEY);
    } catch (error) {
      setEmailVerified(false);
      setEmailVerificationToken("");
      if (error instanceof Error && error.message.includes("déjà associée")) {
        setFormError(error.message);
      } else {
        setFormError(mapVerificationError(error));
      }
    } finally {
      setVerificationPending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!emailVerified || !emailVerificationToken) {
      setFormError("Vérifiez votre adresse e-mail depuis l'e-mail E-Samba avant d'envoyer la demande.");
      return;
    }
    if (!form.company.trim()) {
      setFormError("Renseignez le nom de votre entreprise.");
      return;
    }
    if (!form.country_code) {
      setFormError("Sélectionnez un pays d'Afrique centrale.");
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
      verificationClientRef.current = null;
      setEmailVerificationToken("");
      window.localStorage.removeItem(DEMO_VERIFICATION_DRAFT_KEY);
      window.localStorage.removeItem(DEMO_VERIFICATION_INTENT_KEY);
      await supabase.auth.signOut();
      setSent(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Impossible d'envoyer la demande.");
    }
  }

  if (sent) {
    return <div className={className}><div className="py-8 text-center"><CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" /><h3 className="mb-2 text-xl font-heading font-bold">Demande envoyée !</h3><p className="text-sm text-muted-foreground">Votre adresse e-mail a été vérifiée et votre demande est transmise aux admins. Vous recevrez un email quand votre accès sera accepté ou refusé.</p></div></div>;
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
          {emailVerified ? <p className="flex items-center gap-1 text-xs text-primary"><MailCheck className="h-3.5 w-3.5" />Adresse e-mail vérifiée par E-Samba.</p> : null}
        </div>

        {verificationEmailSent && !emailVerified ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-3">
            <p className="font-medium">Vérifiez votre boîte mail</p>
            <p className="text-xs text-muted-foreground">E-Samba a envoyé un e-mail à <strong>{form.email.trim()}</strong>. Cliquez sur le lien ou le bouton contenu dans cet e-mail. Vous reviendrez automatiquement ici et vos informations seront conservées.</p>
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">Si votre e-mail contient plutôt un code à 6 chiffres, vous pouvez aussi le saisir ici :</p>
              <div className="flex gap-2">
                <Input id="demo-email-otp" aria-label="Code de vérification E-Samba" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" />
                <Button type="button" onClick={() => void verifyEmailCode()} disabled={verificationPending || otp.length !== 6}>Valider</Button>
              </div>
            </div>
          </div>
        ) : null}

        <div><Label htmlFor="demo-phone">Téléphone *</Label><Input id="demo-phone" required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+237 6 XX XX XX XX" className="mt-1" /></div>
        <div><Label htmlFor="demo-company-identifier">Numéro d'identifiant entreprise *</Label><Input id="demo-company-identifier" required value={form.company_identifier} onChange={(event) => setForm({ ...form, company_identifier: event.target.value })} placeholder="RCCM, NIU, NIF..." className="mt-1" /></div>
        <div><Label htmlFor="demo-country">Pays *</Label><Select value={form.country_code} onValueChange={(value) => setForm({ ...form, country_code: value })}><SelectTrigger id="demo-country" className="mt-1"><SelectValue placeholder="Sélectionner un pays" /></SelectTrigger><SelectContent>{CENTRAL_AFRICA_COUNTRIES.map((country) => <SelectItem key={country.code} value={country.code}>{country.label}</SelectItem>)}</SelectContent></Select></div>
        {formError ? <p className="text-xs text-destructive" role="alert">{formError}</p> : null}
        <Button type="submit" className="w-full gap-2" disabled={submitDemoRequest.isPending || verificationPending || !emailVerified}>{submitDemoRequest.isPending ? "Envoi..." : "Demander ma démo"}<ArrowRight className="h-4 w-4" /></Button>
      </div>
    </form>
  );
}
