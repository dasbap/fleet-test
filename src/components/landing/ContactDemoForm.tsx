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
import { useSubmitDemoRequest } from "@/hooks/useSubmitDemoRequest";

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Impossible d'envoyer la demande.");
    }
  }

  if (sent) {
    return (
      <div className={className}>
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h3 className="mb-2 text-xl font-heading font-bold">Demande envoyée !</h3>
          <p className="text-sm text-muted-foreground">
            Votre demande est transmise aux admins. Vous recevrez un email quand votre accès
            sera accepté ou refusé.
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
          <Label htmlFor="demo-company">Entreprise</Label>
          <Input
            id="demo-company"
            value={form.company}
            onChange={(event) => setForm({ ...form, company: event.target.value })}
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
            onChange={(event) => setForm({ ...form, email: event.target.value })}
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
        </div>
        {formError ? <p className="text-xs text-destructive">{formError}</p> : null}
        <Button type="submit" className="w-full gap-2" disabled={submitDemoRequest.isPending}>
          {submitDemoRequest.isPending ? "Envoi..." : "Demander ma démo"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
