import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ContactDemoFormProps {
  className?: string;
}

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
    return "Trop d'e-mails de confirmation ont été demandés. Attendez quelques minutes avant de réessayer.";
  }
  if (normalized.includes("fetch") || normalized.includes("network")) {
    return "Impossible de joindre le service de confirmation E-Samba. Vérifiez votre connexion et réessayez.";
  }
  console.error("[E-Samba] Erreur confirmation email démo", error);
  return "Le service de confirmation e-mail E-Samba n'est pas disponible sur cet environnement. Réessayez plus tard.";
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
  const [form, setForm] = useState<DemoFormState>({
    name: "",
    email: "",
    company: "",
    phone: "",
    company_identifier: "",
    country_code: "",
  });
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo_request_sent") === "1") {
      window.localStorage.removeItem(DEMO_VERIFICATION_DRAFT_KEY);
      window.localStorage.removeItem(DEMO_VERIFICATION_INTENT_KEY);
      setSent(true);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const savedDraft = readSavedDraft();
    if (savedDraft) {
      setForm(savedDraft);
      setVerificationEmailSent(
        window.localStorage.getItem(DEMO_VERIFICATION_INTENT_KEY) === "demo"
      );
    }
  }, []);

  function updateEmail(email: string) {
    setForm((current) => ({ ...current, email }));
    setVerificationEmailSent(false);
  }

  async function sendVerificationEmail() {
    setFormError(null);
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Renseignez une adresse e-mail valide.");
      return;
    }
    if (
      !form.name.trim() ||
      !form.company.trim() ||
      !form.phone.trim() ||
      !form.company_identifier.trim() ||
      !form.country_code
    ) {
      setFormError("Complétez tous les champs avant de confirmer votre adresse e-mail.");
      return;
    }

    setVerificationPending(true);
    try {
      window.localStorage.setItem(
        DEMO_VERIFICATION_DRAFT_KEY,
        JSON.stringify({ ...form, email })
      );
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

      setForm((current) => ({ ...current, email }));
      setVerificationEmailSent(true);
    } catch (error) {
      window.localStorage.removeItem(DEMO_VERIFICATION_INTENT_KEY);
      setFormError(mapVerificationError(error));
    } finally {
      setVerificationPending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await sendVerificationEmail();
  }

  if (sent) {
    return (
      <div className={className}>
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h3 className="mb-2 text-xl font-heading font-bold">Demande envoyée !</h3>
          <p className="text-sm text-muted-foreground">
            Votre adresse e-mail a été confirmée et votre demande est transmise aux admins. Aucun compte E-Samba n'est créé à ce stade. Le compte sera créé uniquement si un administrateur accepte votre demande.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className={className}>
      <h3 className="mb-6 text-xl font-heading font-bold">Planifier ma démo gratuite</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="demo-name">Nom complet *</Label>
          <Input
            id="demo-name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Jean Dupont"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="demo-company">Entreprise *</Label>
          <Input
            id="demo-company"
            required
            value={form.company}
            onChange={(event) => setForm({ ...form, company: event.target.value })}
            placeholder="TransCam SARL"
            className="mt-1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-email">Adresse mail *</Label>
          <Input
            id="demo-email"
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => updateEmail(event.target.value)}
            placeholder="vous@entreprise.com"
          />
        </div>

        {verificationEmailSent ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <MailCheck className="h-4 w-4 text-primary" />
              E-mail de confirmation envoyé
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Ouvrez l'e-mail envoyé à <strong>{form.email.trim()}</strong> et cliquez sur le bouton de confirmation. Votre adresse sera confirmée et la demande sera envoyée automatiquement. Aucun code à saisir n'est nécessaire.
            </p>
          </div>
        ) : null}

        <div>
          <Label htmlFor="demo-phone">Téléphone *</Label>
          <Input
            id="demo-phone"
            required
            type="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder="+237 6 XX XX XX XX"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="demo-company-identifier">Numéro d'identifiant entreprise *</Label>
          <Input
            id="demo-company-identifier"
            required
            value={form.company_identifier}
            onChange={(event) =>
              setForm({ ...form, company_identifier: event.target.value })
            }
            placeholder="RCCM, NIU, NIF..."
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="demo-country">Pays *</Label>
          <Select
            value={form.country_code}
            onValueChange={(value) => setForm({ ...form, country_code: value })}
          >
            <SelectTrigger id="demo-country" className="mt-1">
              <SelectValue placeholder="Sélectionnez un pays" />
            </SelectTrigger>
            <SelectContent>
              {CENTRAL_AFRICA_COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {formError ? (
          <p className="text-xs text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <Button
          type="submit"
          className="w-full gap-2"
          disabled={verificationPending}
        >
          {verificationPending
            ? "Envoi de l'e-mail..."
            : verificationEmailSent
              ? "Renvoyer l'e-mail de confirmation"
              : "Confirmer mon e-mail et envoyer ma demande"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
