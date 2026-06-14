import { Handshake, Globe, TrendingUp, ArrowRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { buildMailtoHref, DEPARTMENT_EMAILS } from "@/config/navigation";

const TYPES_PARTENAIRES = [
  {
    icon: Globe,
    titre: "Revendeurs & Intégrateurs",
    description: "Distribuez E-Samba auprès de votre clientèle transport et logistique. Bénéficiez d'une commission récurrente, de ressources de vente et d'un accès partenaire prioritaire.",
    avantages: ["Commission mensuelle récurrente", "Accès au portail partenaire", "Formation certifiante incluse", "Co-marketing et leads partagés"],
  },
  {
    icon: TrendingUp,
    titre: "Partenaires technologiques",
    description: "Intégrez votre solution GPS, ERP, comptabilité ou Mobile Money avec l'API E-Samba. Nous construisons des connecteurs natifs pour les outils du marché africain.",
    avantages: ["Accès API sandbox gratuit", "Documentation technique complète", "Listing sur notre marketplace", "Support technique dédié"],
  },
  {
    icon: Handshake,
    titre: "Partenaires institutionnels",
    description: "Chambres de commerce, associations de transporteurs, autorités portuaires et douanières — travaillons ensemble à la digitalisation du transport CEMAC.",
    avantages: ["Accord-cadre personnalisé", "Tarifs préférentiels membres", "Formation équipes incluse", "Participation aux événements"],
  },
];

export default function PartenairesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-background via-background to-primary/[0.06] border-b border-border pt-28 pb-12">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
              <Handshake className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading text-4xl font-bold mb-3">Partenaires</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Construisons ensemble l'écosystème du transport intelligent en
              Afrique Centrale. E-Samba propose des programmes de partenariat
              adaptés à chaque profil.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {TYPES_PARTENAIRES.map(({ icon: Icon, titre, description, avantages }) => (
                <div
                  key={titre}
                  className="bg-card border border-border rounded-2xl p-6 flex flex-col"
                >
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="font-heading font-semibold text-base mb-2">{titre}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                    {description}
                  </p>
                  <ul className="space-y-1.5 mb-5">
                    {avantages.map((a) => (
                      <li key={a} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-primary font-bold shrink-0">✓</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={buildMailtoHref(DEPARTMENT_EMAILS.partenaires, {
                      subject: `Programme ${titre}`,
                    })}
                    className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:gap-2 transition-all"
                  >
                    Devenir partenaire <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 bg-muted/30 border-y border-border text-center">
          <div className="container mx-auto px-4 max-w-xl">
            <h2 className="font-heading text-xl font-bold mb-3">
              Vous avez un projet de partenariat ?
            </h2>
            <p className="text-muted-foreground text-sm mb-5">
              Contactez notre équipe Partenariats pour discuter de votre cas
              d'usage et construire une proposition sur mesure.
            </p>
            <a
              href={buildMailtoHref(DEPARTMENT_EMAILS.partenaires)}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
            >
              Contacter l'équipe partenariats
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
