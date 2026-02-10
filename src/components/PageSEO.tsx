import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  getCanonicalUrl,
  getRouteMeta,
} from "@/lib/site";

/**
 * Met à jour le head (canonical, title, description, og:url) à chaque changement de route.
 * À rendre une fois dans l'arbre, à l'intérieur de BrowserRouter.
 */
export function PageSEO() {
  const { pathname } = useLocation();

  useEffect(() => {
    const canonicalUrl = getCanonicalUrl(pathname);
    const { title, description } = getRouteMeta(pathname);

    // Canonical
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonicalUrl;

    // Title
    document.title = title;

    // Meta description
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    // og:url
    let ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = canonicalUrl;
  }, [pathname]);

  return null;
}
