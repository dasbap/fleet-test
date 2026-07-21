import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { PublicPageHero } from "@/components/landing/PublicPageHero";
import { MODULES } from "@/data/marketing/modules";
import { usePageSeo } from "@/hooks/usePageSeo";
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
              <div
                key={module.name}
                className={cn(
                  "relative overflow-hidden rounded-2xl border border-border bg-card p-8",
                  "transition-colors duration-500",
                )}
              >
                <div
                  className={cn(
                    "absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl",
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
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
