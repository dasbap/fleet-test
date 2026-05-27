import { SEO_IA_CLUSTERS } from "./clusters";
import { SEO_IA_MODELES } from "./modeles";
import { SEO_IA_PILLARS } from "./pillars";
import type { SeoIaArticle } from "./types";

export const SEO_IA_PILLAR_SLUGS = SEO_IA_PILLARS.map((a) => a.slug);

export const SEO_IA_ARTICLES: SeoIaArticle[] = [
  ...SEO_IA_PILLARS,
  ...SEO_IA_CLUSTERS,
  ...SEO_IA_MODELES,
];

const BY_SLUG = new Map(SEO_IA_ARTICLES.map((a) => [a.slug, a]));

export function getSeoIaArticleBySlug(slug: string | undefined): SeoIaArticle | undefined {
  if (!slug) return undefined;
  const normalized = slug.replace(/^\/+|\/+$/g, "");
  return BY_SLUG.get(normalized);
}

export function getSeoIaArticlePaths(): string[] {
  return SEO_IA_ARTICLES.map((a) => a.slug);
}

export function getSeoIaHubCards(): Array<{
  slug: string;
  title: string;
  description: string;
  kind: SeoIaArticle["kind"];
}> {
  return SEO_IA_ARTICLES.map((a) => ({
    slug: a.slug,
    title: a.h1,
    description: a.description,
    kind: a.kind,
  }));
}

export function getPillarForArticle(article: SeoIaArticle): SeoIaArticle | undefined {
  if (!article.pillarSlug) return undefined;
  return BY_SLUG.get(article.pillarSlug);
}
