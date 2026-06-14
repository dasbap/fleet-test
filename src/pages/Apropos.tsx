import { Link } from "react-router-dom";
import { Zap, Target, Globe, Users, TrendingUp } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { LANDING_CTA } from "@/config/navigation";

const VALEURS = [
  { icon: Target, titre: "Mission", texte: "Rendre la gestion de flotte professionnelle accessible à toutes les entreprises d'Afrique Centrale, quelle que soit leur taille." },
  { icon: Globe, titre: "Vision", texte: "Devenir la référence incontournable du transport intelligent dans l'espace CEMAC d'ici 2028, connectant 10 000 véhicules sur 6 pays." },
  { icon: Users, titre: "Équipe", texte: "Une équipe pluridisciplinaire basée à Douala, composée d'ingénieurs, de logisticiens et d'experts du transport africain." },
  { icon: TrendingUp, titre: "Impact", texte: "Réduction moyenne de 23 % des coûts opérationnels de flotte pour nos clients, grâce à la maintenance prédictive et au suivi temps réel." },
];

const CHIFFRES = [
  { valeur: "500+", label: "Véhicules gérés" },
  { valeur: "6", label: "Pays CEMAC couverts" },
  { valeur: "99,5 %", label: "Disponibilité garantie" },
  { valeur: "2024", label: "Année de création" },
];

export default function AproposPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-background via-background to-primary/[0.06] border-b border-border pt-28 pb-16">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
              À propos d'E-Samba
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Née à Douala, pensée pour l'Afrique. E-Samba réinvente la gestion
              de flotte pour les entreprises de transport de la zone CEMAC.
            </p>
          </div>
        </section>

        {/* Chiffres clés */}
        <section className="py-14 border-b border-border">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {CHIFFRES.map(({ valeur, label }) => (
                <div key={label} className="text-center">
                  <p className="font-heading text-4xl font-bold text-primary mb-1">{valeur}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Histoire */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="font-heading text-2xl font-bold mb-6">Notre histoire</h2>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                E-Samba est née d'un constat simple : les logiciels de gestion de
                flotte existants sont conçus pour les marchés occidentaux, ignorant
                les réalités du transport en Afrique Centrale — corridors CEMAC,
                paiements Mobile Money, contraintes réseau et infrastructure routière
                spécifique.
              </p>
              <p>
                Fondée en 2024 à Douala par une équipe d'ingénieurs et d'entrepreneurs
                camerounais, E-Samba a été construite depuis le premier jour pour
                répondre aux besoins réels des transporteurs de la zone CEMAC :
                facturation en FCFA, intégration des passages frontaliers, support
                offline pour les zones à faible connectivité, et une interface
                pensée pour les équipes terrain.
              </p>
              <p>
                Aujourd'hui, E-Samba accompagne des PME de transport, des entreprises
                de distribution et des opérateurs logistiques au Cameroun, au Gabon,
                au Tchad, en République Centrafricaine, au Congo et en Guinée
                Équatoriale.
              </p>
            </div>
          </div>
        </section>

        {/* Valeurs */}
        <section className="py-16 bg-muted/30 border-y border-border">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="font-heading text-2xl font-bold mb-10 text-center">Nos engagements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {VALEURS.map(({ icon: Icon, titre, texte }) => (
                <div key={titre} className="bg-card border border-border rounded-2xl p-6">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold mb-2">{titre}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 text-center">
          <div className="container mx-auto px-4 max-w-xl">
            <h2 className="font-heading text-2xl font-bold mb-4">Prêt à optimiser votre flotte ?</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Rejoignez les entreprises qui font confiance à E-Samba pour piloter
              leur mobilité en Afrique Centrale.
            </p>
            <Link
              to={LANDING_CTA.signupHref}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Zap className="w-4 h-4" />
              {LANDING_CTA.signupLabel}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
