import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface PublicPageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
}

/** En-tête standard des pages marketing publiques. */
export function PublicPageHero({ eyebrow, title, description }: PublicPageHeroProps) {
  return (
    <section className="bg-gradient-to-br from-background via-background to-primary/[0.06] border-b border-border pt-28 pb-12">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Accueil
        </Link>
        {eyebrow ? (
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold mt-4 mb-4">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground text-sm md:text-base lg:text-lg max-w-2xl mx-auto">
            {description}
          </p>
        ) : null}
      </div>
    </section>
  );
}
