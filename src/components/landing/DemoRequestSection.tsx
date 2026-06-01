import { Button } from "@/components/ui/button";
import { CheckCircle2, Building2, Truck, Phone, FileDown } from "lucide-react";
import { ContactDemoForm } from "@/components/landing/ContactDemoForm";

const benefits = [
  "Démo personnalisée selon votre secteur",
  "Configuration de votre flotte en direct",
  "Questions / réponses avec un expert",
  "Sans engagement, 30 minutes",
];

export function DemoRequestSection() {
  return (
    <section id="demo" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
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

            <Button asChild variant="outline" className="w-full gap-2">
              <a href="/E-Samba_Brochure_Commerciale.pdf" download>
                <FileDown className="h-4 w-4" />
                Télécharger la brochure commerciale (PDF)
              </a>
            </Button>
          </div>

          <div className="bg-card border rounded-2xl p-8 shadow-lg">
            <ContactDemoForm />
          </div>
        </div>
      </div>
    </section>
  );
}
