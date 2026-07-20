import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { PublicPageHero } from "@/components/landing/PublicPageHero";
import { MODULES } from "@/data/marketing/modules";
import { usePageSeo } from "@/hooks/usePageSeo";
import { getMarketingUrl } from "@/lib/marketing-url";
import { cn } from "@/lib/utils";

export default function ModulesPage() {
  usePageSeo("modules");

  return (
    <PublicPageLayout>
      <PublicPageHero
        eyebrow="Rôles & Modules"
        title={
          <>
            Un accès <span className="text-gradient">adapté</span> à chaque métier
          </>
        }
        description="Chaque utilisateur dispose d'une interface optimisée pour ses besoins. Sécurité et simplicité garanties."
      />

      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto animate-fade-in-up">
            {MODULES.map((module) => (
              <a
                key={module.name}
                href={getMarketingUrl(module.guidePath)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "relative group block rounded-2xl p-8 bg-card border border-border overflow-hidden",
                  "hover:border-primary/50 transition-all duration-500",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                )}
              >
                <div
                  className={cn(
                    "absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl transition-opacity duration-500 group-hover:opacity-20",
                    `bg-gradient-to-br ${module.gradient}`,
                  )}
                />
                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div
                      className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center",
                        `bg-gradient-to-br ${module.gradient}`,
                      )}
                    >
                      <module.icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-xl font-heading font-bold">{module.name}</h2>
                          <p className="text-muted-foreground text-sm">{module.subtitle}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed text-sm md:text-base">
                    {module.description}
                  </p>
                  <ul className="grid grid-cols-2 gap-3">
                    {module.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </a>
            ))}
          </div>

          <p className="text-center mt-8">
            <Button asChild variant="outline" className="gap-2">
              <a href={getMarketingUrl("/guides")} target="_blank" rel="noopener noreferrer">
                Parcourir les guides
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </p>
        </div>
      </section>
    </PublicPageLayout>
  );
}
