import { useState } from "react";
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
import { CheckCircle2, ArrowRight } from "lucide-react";
import { buildWhatsAppUrl, SOCIAL } from "@/config/navigation";
import { useSubmitDemoRequest } from "@/hooks/useSubmitDemoRequest";

export const DEMO_WHATSAPP_URL = buildWhatsAppUrl(SOCIAL.whatsappDemoMessage);

interface ContactDemoFormProps {
  className?: string;
}

/** Formulaire de demande de démo (contact / landing). */
export function ContactDemoForm({ className }: ContactDemoFormProps) {
  const [form, setForm] = useState({ name: "", company: "", phone: "", fleet_size: "" });
  const [sent, setSent] = useState(false);
  const submitDemoRequest = useSubmitDemoRequest();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await submitDemoRequest.mutateAsync({
        name: form.name,
        company: form.company,
        phone: form.phone,
        fleetSize: form.fleet_size,
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
        <div className="text-center py-8">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-heading font-bold mb-2">Demande envoyée !</h3>
          <p className="text-muted-foreground text-sm mb-6">
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
      <h3 className="text-xl font-heading font-bold mb-6">Planifier ma démo gratuite</h3>
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
          <Label htmlFor="demo-fleet">Taille de flotte</Label>
          <Select
            value={form.fleet_size}
            onValueChange={(v) => setForm({ ...form, fleet_size: v })}
          >
            <SelectTrigger id="demo-fleet" className="mt-1">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1–5 véhicules</SelectItem>
              <SelectItem value="10">6–20 véhicules</SelectItem>
              <SelectItem value="50">21–100 véhicules</SelectItem>
              <SelectItem value="200">100+ véhicules</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full gap-2" disabled={submitDemoRequest.isPending}>
          {submitDemoRequest.isPending ? "Envoi..." : "Demander ma démo"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
