import {
  getCanonicalUrlFromPath,
  resolveSeoRouteKey,
  SEO_BY_ROUTE_KEY,
  SITE_BASE_URL,
} from "./seo";

export { SITE_BASE_URL };

export interface RouteMeta {
  title: string;
  description: string;
}

export const ROUTE_META: Record<string, RouteMeta> = Object.fromEntries(
  Object.values(SEO_BY_ROUTE_KEY).map((config) => [
    config.canonicalPath,
    { title: config.title, description: config.description },
  ])
);

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
