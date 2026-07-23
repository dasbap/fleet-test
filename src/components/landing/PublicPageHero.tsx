import type { ReactNode } from "react";

interface PublicPageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
}

/** En-tête standard des pages marketing publiques. */
export function PublicPageHero({
  title,
  description,
}: PublicPageHeroProps) {
  return (
    <section className="bg-gradient-to-br from-background via-background to-primary/[0.06] border-b border-border pt-24 pb-6 md:pt-28">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <h1 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
            {description}
          </p>
        ) : null}
      </div>
    </section>
  );
}
