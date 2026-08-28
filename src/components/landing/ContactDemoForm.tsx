import { useRef, useState } from "react";
import { ArrowRight, CheckCircle2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubmitDemoRequest } from "@/hooks/useSubmitDemoRequest";
import { createEphemeralSupabaseClient } from "@/integrations/supabase/client";

const CENTRAL_AFRICA_COUNTRIES = [
  { code: "CM", label: "Cameroun" },
  { code: "CF", label: "Centrafrique" },
  { code: "TD", label: "Tchad" },
  { code: "CG", label: "Congo" },
  { code: "GA", label: "Gabon" },
  { code: "GQ", label: "Guinée équatoriale" },
] as const;

interface ContactDemoFormProps { className?: string; }

export function ContactDemoForm({ className }: ContactDemoFormProps) {
  const verificationClientRef = useRef<ReturnType<typeof createEphemeralSupabaseClient> | null>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", company_identifier: "", country_code: "" });
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submitDemoRequest = useSubmitDemoRequest();

  function updateEmail(email: string) {
    setForm((current) => ({ ...current, email }));
    verificationClientRef.current = null;
    setOtp("");
    setOtpSent(false);
    setEmailVerified(false);
    setEmailVerificationToken("");
  }

  async function sendVerificationCode() {
    setFormError(null);
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Renseignez une adresse e-mail valide.");
      return;
    }
    setVerificationPending(true);
    try {
      const verificationClient = createEphemeralSupabaseClient();
      verificationClientRef.current = verificationClient;
      const { error } = await verificationClient.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: { demo_verification_pending: true },
        },
      });
      if (error) throw error;
      setOtpSent(true);
      setEmailVerified(false);
      setEmailVerificationToken("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Impossible d'envoyer le code de vérification E-Samba.");
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
    const verificationClient = verificationClientRef.current;
    if (!verificationClient) {
      setFormError("Renvoyez un code de vérification E-Samba.");
      return;
    }
    setVerificationPending(true);
    try {
      const { data, error } = await verificationClient.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
      if (!data.user || data.user.email?.toLowerCase() !== email || !data.session?.access_token) {
        throw new Error("La vérification de l'adresse e-mail a échoué.");
      }
      if (data.user.user_metadata?.demo_verification_pending !== true) {
        throw new Error("Cette adresse e-mail est déjà associée à un compte E-Samba.");
      }
      setEmailVerificationToken(data.session.access_token);
      setEmailVerified(true);
    } catch (error) {
      setEmailVerified(false);
      setEmailVerificationToken("");
      setFormError(error instanceof Error ? error.message : "Code de vérification invalide ou expiré.");
    } finally {
      setVerificationPending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!emailVerified || !emailVerificationToken) {
      setFormError("Vérifiez votre adresse e-mail avec le code E-Samba avant d'envoyer la demande.");
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
        <div className="space-y-2"><Label htmlFor="demo-email">Adresse mail *</Label><div className="flex gap-2"><Input id="demo-email" required type="email" autoComplete="email" value={form.email} onChange={(event) => updateEmail(event.target.value)} placeholder="vous@entreprise.com" disabled={emailVerified} /><Button type="button" variant="outline" onClick={() => void sendVerificationCode()} disabled={verificationPending || emailVerified}>{emailVerified ? "Vérifiée" : otpSent ? "Renvoyer" : "Vérifier"}</Button></div>{emailVerified ? <p className="flex items-center gap-1 text-xs text-primary"><MailCheck className="h-3.5 w-3.5" />Adresse e-mail vérifiée par E-Samba.</p> : null}</div>
        {otpSent && !emailVerified ? <div className="space-y-2"><Label htmlFor="demo-email-otp">Code de vérification E-Samba *</Label><div className="flex gap-2"><Input id="demo-email-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" /><Button type="button" onClick={() => void verifyEmailCode()} disabled={verificationPending || otp.length !== 6}>Valider le code</Button></div><p className="text-xs text-muted-foreground">Un code à 6 chiffres a été envoyé à {form.email.trim()}.</p></div> : null}
        <div><Label htmlFor="demo-phone">Téléphone *</Label><Input id="demo-phone" required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+237 6 XX XX XX XX" className="mt-1" /></div>
        <div><Label htmlFor="demo-company-identifier">Numéro d'identifiant entreprise *</Label><Input id="demo-company-identifier" required value={form.company_identifier} onChange={(event) => setForm({ ...form, company_identifier: event.target.value })} placeholder="RCCM, NIU, NIF..." className="mt-1" /></div>
        <div><Label htmlFor="demo-country">Pays *</Label><Select value={form.country_code} onValueChange={(value) => setForm({ ...form, country_code: value })}><SelectTrigger id="demo-country" className="mt-1"><SelectValue placeholder="Sélectionner un pays" /></SelectTrigger><SelectContent>{CENTRAL_AFRICA_COUNTRIES.map((country) => <SelectItem key={country.code} value={country.code}>{country.label}</SelectItem>)}</SelectContent></Select></div>
        {formError ? <p className="text-xs text-destructive">{formError}</p> : null}
        <Button type="submit" className="w-full gap-2" disabled={submitDemoRequest.isPending || verificationPending || !emailVerified}>{submitDemoRequest.isPending ? "Envoi..." : "Demander ma démo"}<ArrowRight className="h-4 w-4" /></Button>
      </div>
    </form>
  );
}
