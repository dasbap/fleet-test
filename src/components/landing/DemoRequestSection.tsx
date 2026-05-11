import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ArrowRight, Building2, Truck, Phone, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "237641461148";
const DEMO_WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Bonjour, je souhaite demander une démo de E-Samba pour ma flotte.")}`;

const benefits = [
  "Démo personnalisée selon votre secteur",
  "Configuration de votre flotte en direct",
  "Questions / réponses avec un expert",
  "Sans engagement, 30 minutes",
];

export function DemoRequestSection() {
  const [form, setForm] = useState({ name: "", company: "", phone: "", fleet_size: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.from("demo_requests").insert({
        full_name: form.name,
        company: form.company,
        phone: form.phone,
        fleet_size: form.fleet_size ? parseInt(form.fleet_size) : null,
      }).throwOnError();
      setSent(true);
    } catch {
      window.open(DEMO_WHATSAPP_URL, "_blank");
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="demo" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — pitch */}
          <div>
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Demander une démo
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-4 mb-6">
              Voyez E-Samba en action <span className="text-gradient">sur votre flotte</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Un expert E-Samba vous configure une démonstration personnalisée en 30 minutes — taxis, logistique, transport scolaire ou inter-urbain.
            </p>
            <ul className="space-y-3 mb-10">
              {benefits.map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            {/* Stats rapides */}
            <div className="grid grid-cols-3 gap-6 p-6 rounded-2xl bg-muted/40 border mb-6">
              {[
                { icon: Truck, value: "500+", label: "Véhicules gérés" },
                { icon: Building2, value: "3", label: "Pays CEMAC" },
                { icon: Phone, value: "< 5 min", label: "Setup mobile" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="text-center">
                  <Icon className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="font-bold text-lg">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* Brochure PDF */}
            <Button asChild variant="outline" className="w-full gap-2">
              <a href="/E-Samba_Brochure_Commerciale.pdf" download>
                <FileDown className="h-4 w-4" />
                Télécharger la brochure commerciale (PDF)
              </a>
            </Button>
          </div>

          {/* Right — formulaire */}
          <div className="bg-card border rounded-2xl p-8 shadow-lg">
            {sent ? (
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
                    💬 WhatsApp (réponse immédiate)
                  </a>
                </Button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-1">Réserver une démo gratuite</h3>
                <p className="text-sm text-muted-foreground mb-6">Réponse sous 24h · Sans engagement</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="demo-name">Nom complet *</Label>
                    <Input id="demo-name" placeholder="Jean Dupont"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div>
                    <Label htmlFor="demo-company">Entreprise / Organisation</Label>
                    <Input id="demo-company" placeholder="Trans-Afrique SARL"
                      value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
                  </div>
                  <div>
                    <Label htmlFor="demo-phone">Téléphone (WhatsApp) *</Label>
                    <Input id="demo-phone" type="tel" placeholder="+237 6XX XXX XXX"
                      value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
                  </div>
                  <div>
                    <Label htmlFor="demo-fleet">Taille de votre flotte</Label>
                    <Select value={form.fleet_size} onValueChange={v => setForm(f => ({ ...f, fleet_size: v }))}>
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
                    <a href={DEMO_WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline">
                      WhatsApp →
                    </a>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
