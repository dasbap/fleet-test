import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULES } from "@/data/marketing/modules";
import { getMarketingUrl } from "@/lib/marketing-url";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const ModulesSection = () => {
  return (
    <section id="modules" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            Rôles & Modules
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mt-4 mb-6">
            Un accès <span className="text-gradient">adapté</span> à chaque
            métier
          </h2>
          <p className="text-muted-foreground text-lg">
            Chaque utilisateur dispose d&apos;une interface optimisée pour ses
            besoins. Sécurité et simplicité garanties.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {MODULES.map((module) => (
            <a
              key={module.name}
              href={getMarketingUrl(module.guidePath)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "relative group block rounded-2xl p-8 bg-card border border-border overflow-hidden",
                "hover:border-primary/30 transition-all duration-500 cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              <div
                className={cn(
                  "absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl transition-opacity duration-500",
                  "group-hover:opacity-20",
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
                  <div>
                    <h3 className="text-xl font-heading font-bold">
                      {module.name}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {module.subtitle}
                    </p>
                  </div>
                </div>

                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {module.description}
                </p>

                <ul className="grid grid-cols-2 gap-3">
                  {module.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </a>
          ))}
        </div>

        <p className="text-center mt-12">
          <Link
            to={ROUTE_PATHS.modules}
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            Voir tous les modules
            <ArrowRight className="w-4 h-4" />
          </Link>
        </p>
      </div>
    </section>
  );
};

export default ModulesSection;
