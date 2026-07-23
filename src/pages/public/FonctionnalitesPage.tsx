import { Link } from "react-router-dom";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { PublicPageHero } from "@/components/landing/PublicPageHero";
import { FONCTIONNALITE_SECTIONS } from "@/data/marketing/fonctionnalite-sections";
import { usePageSeo } from "@/hooks/usePageSeo";

export default function FonctionnalitesPage() {
  usePageSeo("fonctionnalites");
  const section = FONCTIONNALITE_SECTIONS[0];
  const benefits = [
    {
      title: "Voir plus clair",
      text: "Une lecture simple de la flotte, des equipes et des priorites du jour.",
    },
    {
      title: "Agir plus vite",
      text: "Des signaux utiles pour prendre les bonnes decisions sans multiplier les appels.",
    },
    {
      title: "Garder le cap",
      text: "Une direction mieux informee, sans exposer les regles internes du produit.",
    },
  ];

  return (
    <PublicPageLayout showWhatsApp={false}>
      <PublicPageHero
        eyebrow="Fonctionnalites"
        title={
          <>
            Une flotte plus <span className="text-gradient">lisible</span>, sans tout devoiler
          </>
        }
        description="E-Samba presente la valeur de votre pilotage de flotte de facon claire, rassurante et volontairement generale."
      />

      <section className="py-10 md:py-14">
        <div className="container mx-auto max-w-5xl px-4">
          <Link
            to={`/fonctionnalites/${section.slug}`}
            className="group grid gap-6 rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:grid-cols-[0.85fr_1.15fr] md:items-center md:p-8"
          >
            <div>
              <h2 className="font-heading text-3xl font-bold group-hover:text-primary md:text-4xl">
                {section.title}
              </h2>
            </div>
            <div className="space-y-5">
              <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                {section.intro}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {benefits.map((benefit) => (
                  <div key={benefit.title} className="rounded-lg border border-border p-4">
                    <h3 className="mb-2 font-heading text-base font-semibold">
                      {benefit.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {benefit.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        </div>
      </section>
    </PublicPageLayout>
  );
}
