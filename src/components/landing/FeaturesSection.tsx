import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { FONCTIONNALITES } from "@/data/marketing/fonctionnalites";
import { getMarketingUrl } from "@/lib/marketing-url";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            Fonctionnalités
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mt-4 mb-6">
            Tout ce qu&apos;il faut pour{" "}
            <span className="text-gradient">optimiser</span> votre flotte
          </h2>
          <p className="text-muted-foreground text-lg">
            Une suite complète d&apos;outils conçus pour les réalités du transport en
            Afrique. Simple, puissant, accessible.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FONCTIONNALITES.map((feature, index) => (
            <a
              key={feature.title}
              href={getMarketingUrl(feature.guidePath)}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                  feature.color === "primary"
                    ? "bg-primary/10 text-primary"
                    : "bg-accent/10 text-accent-foreground"
                }`}
              >
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </a>
          ))}
        </div>

        <p className="text-center mt-12">
          <Link
            to={ROUTE_PATHS.fonctionnalites}
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            Voir toutes les fonctionnalités
            <ArrowRight className="w-4 h-4" />
          </Link>
        </p>
      </div>
    </section>
  );
};

export default FeaturesSection;
