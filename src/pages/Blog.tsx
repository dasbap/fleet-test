import { Link } from "react-router-dom";
import { Zap, BookOpen, ArrowRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const ARTICLES = [
  {
    categorie: "Guide",
    titre: "Comment réduire les coûts de carburant de votre flotte avec l'IA",
    extrait: "La détection de comportements de conduite anormaux peut générer jusqu'à 18 % d'économies sur le poste carburant. Voici comment E-Samba y contribue.",
    date: "5 mai 2026",
    slug: "#",
  },
  {
    categorie: "Réglementation",
    titre: "Transit CEMAC 2026 : ce qui change pour les transporteurs",
    extrait: "Nouveaux documents requis aux postes-frontières, procédures dématérialisées, délais de transit — le point complet sur les évolutions réglementaires CEMAC.",
    date: "28 avril 2026",
    slug: "#",
  },
  {
    categorie: "Produit",
    titre: "Lancement du module Dashcam AI : surveillance intelligente des véhicules",
    extrait: "E-Samba intègre désormais l'analyse vidéo embarquée pour détecter la fatigue conducteur et les situations à risque en temps réel.",
    date: "15 avril 2026",
    slug: "#",
  },
  {
    categorie: "Maintenance",
    titre: "Maintenance prédictive vs préventive : que choisir pour votre parc ?",
    extrait: "Comparatif des deux approches à l'aune des conditions terrain africaines : routes, températures, disponibilité des pièces détachées.",
    date: "3 avril 2026",
    slug: "#",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-background via-background to-primary/[0.06] border-b border-border pt-28 pb-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading text-4xl font-bold mb-2">Blog E-Samba</h1>
            <p className="text-muted-foreground">
              Guides, réglementations CEMAC, bonnes pratiques transport et actualités produit.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {ARTICLES.map((article) => (
                <article
                  key={article.titre}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all duration-200 flex flex-col"
                >
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                    {article.categorie}
                  </span>
                  <h2 className="font-heading font-semibold text-base mb-2 leading-snug">
                    {article.titre}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                    {article.extrait}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground/60">{article.date}</span>
                    <a
                      href={article.slug}
                      className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:gap-2 transition-all"
                    >
                      Lire <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                D'autres articles sont en cours de rédaction. Inscrivez-vous pour être
                notifié des nouvelles publications.
              </p>
              <a
                href="mailto:contact@e-samba.com?subject=Newsletter E-Samba"
                className="inline-flex items-center gap-2 border border-border rounded-xl px-5 py-2.5 text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Zap className="w-4 h-4" />
                S'abonner à la newsletter
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
