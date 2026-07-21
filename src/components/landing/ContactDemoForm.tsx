import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
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
import { buildWhatsAppUrl, SOCIAL } from "@/config/navigation";
import { useSubmitDemoRequest } from "@/hooks/useSubmitDemoRequest";

export const DEMO_WHATSAPP_URL = buildWhatsAppUrl(SOCIAL.whatsappDemoMessage);

const CENTRAL_AFRICA_COUNTRIES = [
  { code: "CM", label: "Cameroun" },
  { code: "CF", label: "Centrafrique" },
  { code: "TD", label: "Tchad" },
  { code: "CG", label: "Congo" },
  { code: "GA", label: "Gabon" },
  { code: "GQ", label: "Guinée équatoriale" },
] as const;

interface ContactDemoFormProps {
  className?: string;
}

/** Formulaire de demande de démo (contact / landing). */
export function ContactDemoForm({ className }: ContactDemoFormProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    company_identifier: "",
    country_code: "",
  });
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submitDemoRequest = useSubmitDemoRequest();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
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
      });
      setSent(true);
    } catch {
      window.open(DEMO_WHATSAPP_URL, "_blank");
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className={className}>
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h3 className="mb-2 text-xl font-heading font-bold">Demande envoyée !</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Notre équipe vous contactera sous 24h ouvrées pour planifier votre démo.
          </p>
          <Button asChild variant="outline" className="w-full">
            <a href={DEMO_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              WhatsApp (réponse immédiate)
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <h3 className="mb-6 text-xl font-heading font-bold">Planifier ma démo gratuite</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="demo-name">Nom complet *</Label>
          <Input
            id="demo-name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jean Dupont"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="demo-company">Entreprise</Label>
          <Input
            id="demo-company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="TransCam SARL"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="demo-email">Adresse mail *</Label>
          <Input
            id="demo-email"
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="vous@entreprise.com"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="demo-phone">Téléphone *</Label>
          <Input
            id="demo-phone"
            required
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
            onChange={(e) => setForm({ ...form, company_identifier: e.target.value })}
            placeholder="RCCM, NIU, NIF..."
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="demo-country">Pays *</Label>
          <Select value={form.country_code} onValueChange={(v) => setForm({ ...form, country_code: v })}>
            <SelectTrigger id="demo-country" className="mt-1">
              <SelectValue placeholder="Sélectionner un pays" />
            </SelectTrigger>
            <SelectContent>
              {CENTRAL_AFRICA_COUNTRIES.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formError ? <p className="mt-1 text-xs text-destructive">{formError}</p> : null}
        </div>
        <Button type="submit" className="w-full gap-2" disabled={submitDemoRequest.isPending}>
          {submitDemoRequest.isPending ? "Envoi..." : "Demander ma démo"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
