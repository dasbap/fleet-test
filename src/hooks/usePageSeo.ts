import { useMemo } from "react";
import { useSeoMeta } from "@/hooks/useSeoMeta";
import {
  getCanonicalUrlFromPath,
  type SeoMetaTag,
  SEO_BY_ROUTE_KEY,
  type SeoRouteKey,
} from "@/lib/seo";

interface UsePageSeoOverrides {
  title?: string;
  description?: string;
  canonicalPath?: string;
  metas?: SeoMetaTag[];
}

export function usePageSeo(routeKey: SeoRouteKey, overrides: UsePageSeoOverrides = {}) {
  const config = SEO_BY_ROUTE_KEY[routeKey];

  const title = overrides.title ?? config.title;
  const description = overrides.description ?? config.description;
  const canonicalPath = overrides.canonicalPath ?? config.canonicalPath;

  const metas = useMemo(
    () => [
      { name: "description", content: description },
      { property: "og:url", content: getCanonicalUrlFromPath(canonicalPath) },
      ...(config.metas ?? []),
      ...(overrides.metas ?? []),
    ],
    [canonicalPath, config.metas, description, overrides.metas]
  );

  useSeoMeta({
    title,
    canonical: getCanonicalUrlFromPath(canonicalPath),
    metas,
  });
}

