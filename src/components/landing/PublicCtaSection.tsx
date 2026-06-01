import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PUBLIC_DEMO_HREF } from "@/data/marketing/public-nav";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/** CTA final unifié sur toutes les pages marketing publiques. */
export function PublicCtaSection() {
  return (
    <section className="py-20 md:py-32 bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 text-center max-w-2xl">
        <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
          Prêt à <span className="text-gradient">piloter</span> votre flotte ?
        </h2>
        <p className="text-muted-foreground text-sm md:text-base mb-8">
          Essai gratuit jusqu&apos;à 3 véhicules · Sans engagement · Setup en moins de 5 minutes
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
          <Button asChild className="w-full sm:w-auto shadow-glow gap-2">
            <Link to={`${ROUTE_PATHS.auth}?mode=signup`}>
              Démarrer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to={PUBLIC_DEMO_HREF}>Demander une démo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
