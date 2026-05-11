import { Link } from "react-router-dom";
import { BookOpen, Code2, Zap, ArrowRight, FileText, Layers } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const SECTIONS = [
  {
    icon: Zap,
    titre: "Démarrage rapide",
    description: "Créez votre flotte, invitez votre équipe et ajoutez vos premiers véhicules en moins de 10 minutes.",
    href: "/aide",
    label: "Voir le guide",
  },
  {
    icon: Layers,
    titre: "Modules",
    description: "Documentation complète de chaque module : Véhicules, Maintenance, Inspections DVIR, GPS, Finances, Transit CEMAC.",
    href: "/aide",
    label: "Explorer les modules",
  },
  {
    icon: Code2,
    titre: "API REST",
    description: "Intégrez E-Samba dans vos systèmes existants (ERP, comptabilité, GPS tiers). Référence complète des endpoints.",
    href: "/api",
    label: "Référence API",
  },
  {
    icon: FileText,
    titre: "Guides thématiques",
    description: "Transit CEMAC, Mobile Money, gestion des rôles, configuration des alertes, rapports automatiques.",
    href: "/aide",
    label: "Lire les guides",
  },
];

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-background via-background to-primary/[0.06] border-b border-border pt-28 pb-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading text-4xl font-bold mb-3">Documentation</h1>
            <p className="text-muted-foreground max-w-xl">
              Tout ce dont vous avez besoin pour maîtriser E-Samba et intégrer
              notre API dans vos systèmes.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SECTIONS.map(({ icon: Icon, titre, description, href, label }) => (
                <Link
                  key={titre}
                  to={href}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all duration-200 flex flex-col group"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="font-heading font-semibold mb-2">{titre}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                    {description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                    {label} <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-12 bg-muted/40 border border-border rounded-2xl p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                La documentation complète est en cours de rédaction. Vous pouvez
                accéder au Centre d'aide pour des réponses immédiates à vos
                questions.
              </p>
              <Link
                to="/aide"
                className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
              >
                Aller au Centre d'aide <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
