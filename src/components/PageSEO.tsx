import { useLocation } from "react-router-dom";
import { usePageSeo } from "@/hooks/usePageSeo";
import { resolveSeoRouteKey } from "@/lib/seo";

/**
 * Met à jour le head (canonical, title, description, og:url) à chaque changement de route.
 * À rendre une fois dans l'arbre, à l'intérieur de BrowserRouter.
 */
export function PageSEO() {
  const { pathname } = useLocation();
  const routeKey = resolveSeoRouteKey(pathname);
  usePageSeo(routeKey);

  return null;
}
