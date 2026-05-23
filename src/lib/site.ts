import publishedUseCases from "../data/published-use-cases.json";
import {
  getCanonicalUrlFromPath,
  resolveSeoRouteKey,
  SEO_BY_ROUTE_KEY,
  SITE_BASE_URL,
} from "./seo";
import { buildResourceRouteMeta } from "./seo-resources";

export { SITE_BASE_URL };
import type { RouteMeta } from "./route-meta-types";

export type { RouteMeta };

const STATIC_ROUTE_META: Record<string, RouteMeta> = Object.fromEntries(
  Object.values(SEO_BY_ROUTE_KEY).map((config) => [
    config.canonicalPath,
    { title: config.title, description: config.description },
  ])
);

/** Métas des pages /use-case/{slug} — synchronisées avec data/published-use-cases.json */
const USE_CASE_ROUTE_META: Record<string, RouteMeta> = Object.fromEntries(
  publishedUseCases.map((page) => [
    `/use-case/${page.slug}`,
    { title: page.title, description: page.meta_description },
  ])
);

const RESOURCE_ROUTE_META = buildResourceRouteMeta();

export const ROUTE_META: Record<string, RouteMeta> = {
  ...STATIC_ROUTE_META,
  ...USE_CASE_ROUTE_META,
  ...RESOURCE_ROUTE_META,
};

export function getRouteMeta(pathname: string): RouteMeta {
  const key = resolveSeoRouteKey(pathname);
  const config = SEO_BY_ROUTE_KEY[key];
  return {
    title: config.title,
    description: config.description,
  };
}

export function getCanonicalUrl(pathname: string): string {
  return getCanonicalUrlFromPath(pathname);
}
