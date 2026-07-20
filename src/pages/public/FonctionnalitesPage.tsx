import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { PublicPageHero } from "@/components/landing/PublicPageHero";
import { PublicCtaSection } from "@/components/landing/PublicCtaSection";
import { MarketingCard } from "@/components/landing/MarketingCard";
import { FONCTIONNALITES } from "@/data/marketing/fonctionnalites";
import { usePageSeo } from "@/hooks/usePageSeo";
import { getMarketingUrl } from "@/lib/marketing-url";

export default function FonctionnalitesPage() {
  usePageSeo("fonctionnalites");

  return (
    <PublicPageLayout>
      <PublicPageHero
        eyebrow="Fonctionnalités"
        title={
          <>
            Tout ce qu&apos;il faut pour{" "}
            <span className="text-gradient">optimiser</span> votre flotte
          </>
        }
        description="Une suite complète d'outils conçus pour les réalités du transport en Afrique. Simple, puissant, accessible."
      />

      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
            {FONCTIONNALITES.map((feature) => (
              <MarketingCard
                key={feature.title}
                href={feature.guidePath}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                iconClassName={
                  feature.color === "primary"
                    ? "bg-primary/10 text-primary"
                    : "bg-accent/10 text-accent-foreground"
                }
              />
            ))}
          </div>

          <p className="text-center mt-12">
            <Button asChild variant="outline" className="gap-2">
              <a
                href={getMarketingUrl("/fonctionnalites")}
                target="_blank"
                rel="noopener noreferrer"
              >
                Voir la documentation complète
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </p>
        </div>
      </section>

      <PublicCtaSection />
    </PublicPageLayout>
  );
}
