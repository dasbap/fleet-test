import { Link, Navigate } from "react-router-dom";
import { PublicPageLayout } from "@/components/landing/PublicPageLayout";
import { PublicPageHero } from "@/components/landing/PublicPageHero";
import {
  getFonctionnaliteSection,
  type FonctionnaliteSectionSlug,
} from "@/data/marketing/fonctionnalite-sections";
import { usePageSeo } from "@/hooks/usePageSeo";
import { ROUTE_PATHS } from "@/navigation/routePaths";

interface FonctionnaliteSectionPageProps {
  slug: FonctionnaliteSectionSlug;
}

export function FonctionnaliteSectionPage({ slug }: FonctionnaliteSectionPageProps) {
  usePageSeo("fonctionnalites");
  const section = getFonctionnaliteSection(slug);

  if (!section) {
    return <Navigate to={ROUTE_PATHS.fonctionnalites} replace />;
  }

  return (
    <PublicPageLayout showWhatsApp={false}>
      <PublicPageHero
        eyebrow="Fonctionnalites"
        title={section.title}
        description={section.intro}
      />

      <section className="py-8 md:py-10">
        <div className="container mx-auto max-w-3xl px-4">
          <Link
            to={ROUTE_PATHS.fonctionnalites}
            className="mb-4 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Retour aux fonctionnalites
          </Link>
          <div className="rounded-xl border border-border bg-card p-5 md:p-6">
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              {section.promise}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {section.items.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}

export default FonctionnaliteSectionPage;
