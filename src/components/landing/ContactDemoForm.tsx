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
import { supabase } from "@/integrations/supabase/client";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "237641341857";
export const DEMO_WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Bonjour, je souhaite demander une démo de E-Samba pour ma flotte.")}`;

interface ContactDemoFormProps {
  className?: string;
}

/** Formulaire de demande de démo (contact / landing). */
export function ContactDemoForm({ className }: ContactDemoFormProps) {
  const [form, setForm] = useState({ name: "", company: "", phone: "", fleet_size: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase
        .from("demo_requests")
        .insert({
          full_name: form.name,
          company: form.company,
          phone: form.phone,
          fleet_size: form.fleet_size ? parseInt(form.fleet_size, 10) : null,
        })
        .throwOnError();
      setSent(true);
    } catch {
      window.open(DEMO_WHATSAPP_URL, "_blank");
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className={className}>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">Demande envoyée !</h3>
          <p className="text-muted-foreground mb-6">
            Nous vous contactons sous 24h pour fixer le créneau.
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
    <div className={className}>
      <h3 className="text-xl font-bold mb-1">Réserver une démo gratuite</h3>
      <p className="text-sm text-muted-foreground mb-6">Réponse sous 24h · Sans engagement</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="demo-name">Nom complet *</Label>
          <Input
            id="demo-name"
            placeholder="Jean Dupont"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="demo-company">Entreprise / Organisation</Label>
          <Input
            id="demo-company"
            placeholder="Trans-Afrique SARL"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="demo-phone">Téléphone (WhatsApp) *</Label>
          <Input
            id="demo-phone"
            type="tel"
            placeholder="+237 6XX XXX XXX"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="demo-fleet">Taille de votre flotte</Label>
          <Select
            value={form.fleet_size || undefined}
            onValueChange={(v) => setForm((f) => ({ ...f, fleet_size: v }))}
          >
            <SelectTrigger id="demo-fleet">
              <SelectValue placeholder="Nombre de véhicules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">1 – 3 véhicules</SelectItem>
              <SelectItem value="10">4 – 10 véhicules</SelectItem>
              <SelectItem value="25">11 – 25 véhicules</SelectItem>
              <SelectItem value="50">26 – 50 véhicules</SelectItem>
              <SelectItem value="100">50+ véhicules</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full shadow-glow" disabled={loading}>
          {loading ? "Envoi..." : "Demander ma démo gratuite"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Ou directement sur{" "}
          <a
            href={DEMO_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            WhatsApp →
          </a>
        </p>
      </form>
    </div>
  );
}
