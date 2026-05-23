import { Link } from "react-router-dom";
import { ChevronRight, Clock, Calendar } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { FaqSchemaOrg } from "@/components/faq/FaqSchemaOrg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductBridgeCard } from "@/features/resources/components/ProductBridgeCard";
import { getPillarForArticle, getSeoIaArticleBySlug } from "@/content/seo-ia/registry";
import { getSeoIaCanonicalPath } from "@/lib/seo-resources";
import type { SeoIaArticle } from "@/content/seo-ia/types";
import { usePageSeo } from "@/hooks/usePageSeo";
import { SEO_ROUTE_KEYS } from "@/lib/seo";

interface ResourceArticleLayoutProps {
  article: SeoIaArticle;
  children?: React.ReactNode;
}

export function ResourceArticleLayout({ article, children }: ResourceArticleLayoutProps) {
  const canonicalPath = getSeoIaCanonicalPath(article.slug);
  usePageSeo(SEO_ROUTE_KEYS.notFound, {
    title: article.title,
    description: article.description,
    canonicalPath,
  });

  const pillar = getPillarForArticle(article);
  const related = article.relatedSlugs
    .map((s) => getSeoIaArticleBySlug(s))
    .filter((a): a is SeoIaArticle => Boolean(a));

  const kindLabel =
    article.kind === "pillar"
      ? "Guide pilier"
      : article.kind === "modele"
        ? "Modèle"
        : "Article";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <FaqSchemaOrg items={article.faq} />
      <Navbar />

      <main className="flex-1">
        <div className="border-b border-border bg-gradient-to-br from-background via-background to-primary/[0.06] pt-24 pb-8">
          <div className="container mx-auto px-4 max-w-3xl">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-6" aria-label="Fil d'Ariane">
              <Link to="/ressources" className="hover:text-primary">
                Ressources
              </Link>
              <ChevronRight className="h-4 w-4 shrink-0" />
              <Link to="/ressources/seo-ia" className="hover:text-primary">
                SEO &amp; IA
              </Link>
              <ChevronRight className="h-4 w-4 shrink-0" />
              <span className="text-foreground line-clamp-1">{article.h1}</span>
            </nav>
            <p className="text-xs font-medium uppercase tracking-wide text-primary mb-2">{kindLabel}</p>
            <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">{article.h1}</h1>
            <p className="text-muted-foreground mb-4">{article.description}</p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Mis à jour le {article.dateModified}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {article.readingMinutes} min de lecture
              </span>
            </div>
          </div>
        </div>

        <article className="container mx-auto px-4 max-w-3xl py-12">
          {article.leadMagnet && (
            <Card className="mb-10 border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">{article.leadMagnet.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{article.leadMagnet.body}</p>
              </CardContent>
            </Card>
          )}

          {pillar && (
            <p className="text-sm mb-8">
              <span className="text-muted-foreground">Pilier parent : </span>
              <Link
                to={`/ressources/seo-ia/${pillar.slug}`}
                className="text-primary hover:underline font-medium"
              >
                {pillar.h1}
              </Link>
            </p>
          )}

          <div className="prose prose-invert max-w-none space-y-10">
            {article.sections.map((section) => (
              <section key={section.id} id={section.id}>
                <h2 className="font-heading text-2xl font-semibold mb-3 scroll-mt-24">{section.heading}</h2>
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)} className="text-muted-foreground leading-relaxed mb-3">
                    {p}
                  </p>
                ))}
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    {section.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {children}

          {(article.ctaPrimary || article.ctaSecondary) && (
            <div className="flex flex-wrap gap-3 mt-12">
              {article.ctaPrimary && (
                <Button asChild>
                  <Link
                    to={
                      article.ctaPrimary.href.startsWith("/")
                        ? article.ctaPrimary.href
                        : article.ctaPrimary.href.startsWith("#")
                          ? article.ctaPrimary.href
                          : `#${article.ctaPrimary.href}`
                    }
                  >
                    {article.ctaPrimary.label}
                  </Link>
                </Button>
              )}
              {article.ctaSecondary && (
                <Button asChild variant="outline">
                  <Link to={article.ctaSecondary.href}>{article.ctaSecondary.label}</Link>
                </Button>
              )}
            </div>
          )}

          <div className="mt-12">
            <ProductBridgeCard contentSlug={article.slug} />
          </div>

          {related.length > 0 && (
            <section className="mt-16 border-t border-border pt-10" aria-labelledby="related-heading">
              <h2 id="related-heading" className="font-heading text-xl font-semibold mb-6">
                À lire ensuite
              </h2>
              <ul className="space-y-3">
                {related.map((rel) => (
                  <li key={rel.slug}>
                    <Link
                      to={`/ressources/seo-ia/${rel.slug}`}
                      className="text-primary hover:underline"
                    >
                      {rel.h1}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {article.faq.length > 0 && (
            <section id="faq" className="mt-16 border-t border-border pt-10" aria-labelledby="faq-heading">
              <h2 id="faq-heading" className="font-heading text-xl font-semibold mb-6">
                Questions fréquentes
              </h2>
              <dl className="space-y-6">
                {article.faq.map((item) => (
                  <div key={item.id}>
                    <dt className="font-medium mb-2">{item.question}</dt>
                    <dd className="text-sm text-muted-foreground">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </article>
      </main>

      <Footer />
    </div>
  );
}
