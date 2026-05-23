import { SEO_IA_ARTICLES, getSeoIaArticlePaths } from "../content/seo-ia/registry";
import type { RouteMeta } from "./route-meta-types";

const HUB_PREFIX = "/ressources";

/** Index des ressources. */
export const RESOURCES_INDEX_META: RouteMeta = {
  title: "Ressources E-Samba | Guides flotte et contenu B2B",
  description:
    "Guides pratiques sur la gestion de flotte, les opérations B2B à l'échelle et la production de contenu assistée par IA.",
};

/** Méta SEO des pages hub et articles (pré-rendu + ROUTE_META). */
const SEO_IA_HUB_META: RouteMeta = {
  title: "Hub SEO & IA | Guides contenu généré | E-Samba",
  description:
    "Optimisation contenu IA pour le SEO : piliers, briefs, prompts, score qualité et production B2B à l'échelle.",
};

export function buildResourceRouteMeta(): Record<string, RouteMeta> {
  const meta: Record<string, RouteMeta> = {
    [HUB_PREFIX]: RESOURCES_INDEX_META,
    [`${HUB_PREFIX}/seo-ia`]: SEO_IA_HUB_META,
  };

  for (const article of SEO_IA_ARTICLES) {
    const path = getSeoIaCanonicalPath(article.slug);
    meta[path] = {
      title: article.title,
      description: article.description,
    };
  }

  return meta;
}

export function getSeoIaCanonicalPath(slug: string): string {
  if (slug === "hub") {
    return `${HUB_PREFIX}/seo-ia`;
  }
  return `${HUB_PREFIX}/seo-ia/${slug}`;
}

export function getAllResourcePrerenderPaths(): string[] {
  return [HUB_PREFIX, ...getSeoIaArticlePaths().map((slug) => getSeoIaCanonicalPath(slug))];
}

export function getResourceMetaByPathname(pathname: string): RouteMeta | null {
  const normalized =
    pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const all = buildResourceRouteMeta();
  return all[normalized] ?? null;
}
