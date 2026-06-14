import { MapPin, Clock, ArrowRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { buildMailtoHref, DEPARTMENT_EMAILS } from "@/config/navigation";

const POSTES = [
  {
    titre: "Développeur Full-Stack React / Node.js",
    lieu: "Douala, Cameroun",
    type: "CDI",
    description: "Rejoignez l'équipe produit pour construire les fonctionnalités qui transforment la gestion de flotte en Afrique Centrale. Stack : React, TypeScript, Supabase, Tailwind.",
  },
  {
    titre: "Responsable Partenariats CEMAC",
    lieu: "Douala / Yaoundé / Remote",
    type: "CDI",
    description: "Développez le réseau de partenaires revendeurs et intégrateurs dans les 6 pays de la zone CEMAC. Profil : commercial B2B, expérience transport ou logistique.",
  },
  {
    titre: "Chargé(e) de Support Client",
    lieu: "Douala, Cameroun",
    type: "CDI",
    description: "Accompagnez nos clients transporteurs dans la prise en main de la plateforme et répondez à leurs questions techniques et fonctionnelles.",
  },
];

const AVANTAGES = [
  "Environnement de travail flexible (hybride)",
  "Produit à impact réel sur l'économie africaine",
  "Équipe à taille humaine, décisions rapides",
  "Formation continue et veille technologique",
  "Rémunération compétitive en FCFA",
  "Opportunités de mobilité dans la zone CEMAC",
];

export default function CarrieresPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-background via-background to-primary/[0.06] border-b border-border pt-28 pb-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h1 className="font-heading text-4xl font-bold mb-3">Carrières</h1>
            <p className="text-muted-foreground max-w-xl">
              Rejoignez une équipe qui construit l'avenir du transport intelligent
              en Afrique Centrale. Nous cherchons des personnes passionnées,
              autonomes et prêtes à avoir un impact réel.
            </p>
          </div>
        </section>

        {/* Postes ouverts */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="font-heading text-2xl font-bold mb-8">Postes ouverts</h2>
            <div className="space-y-5">
              {POSTES.map((poste) => (
                <div
                  key={poste.titre}
                  className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <h3 className="font-heading font-semibold text-base">{poste.titre}</h3>
                    <span className="shrink-0 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                      {poste.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {poste.lieu}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Temps plein
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {poste.description}
                  </p>
                  <a
                    href={buildMailtoHref(DEPARTMENT_EMAILS.rh, {
                      subject: `Candidature — ${poste.titre}`,
                    })}
                    className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:gap-2 transition-all"
                  >
                    Postuler <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Avantages */}
        <section className="py-14 bg-muted/30 border-y border-border">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="font-heading text-2xl font-bold mb-8 text-center">
              Pourquoi rejoindre E-Samba ?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVANTAGES.map((avantage) => (
                <div
                  key={avantage}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-primary font-bold shrink-0">✓</span>
                  {avantage}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Candidature spontanée */}
        <section className="py-14 text-center">
          <div className="container mx-auto px-4 max-w-xl">
            <h2 className="font-heading text-xl font-bold mb-3">
              Pas le bon poste pour vous ?
            </h2>
            <p className="text-muted-foreground text-sm mb-5">
              Envoyez une candidature spontanée. Nous gardons tous les profils
              pertinents en base et revenons vers vous dès qu'une opportunité
              se présente.
            </p>
            <a
              href={buildMailtoHref(DEPARTMENT_EMAILS.rh, {
                subject: "Candidature spontanée",
              })}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
            >
              Envoyer ma candidature
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
