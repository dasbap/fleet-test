import { useEffect } from "react";

type SeoMetaTag = {
  name?: string;
  property?: string;
  content: string;
};

type UseSeoMetaOptions = {
  title?: string;
  canonical?: string;
  metas?: SeoMetaTag[];
};

const ensureMetaTag = (tag: SeoMetaTag) => {
  const selector = tag.name
    ? `meta[name="${tag.name}"]`
    : `meta[property="${tag.property}"]`;

  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement("meta");
    if (tag.name) meta.setAttribute("name", tag.name);
    if (tag.property) meta.setAttribute("property", tag.property);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", tag.content);
};

export function useSeoMeta({ title, canonical, metas = [] }: UseSeoMetaOptions) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    if (canonical) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
      ensureMetaTag({ property: "og:url", content: canonical });
    }

    if (title) {
      ensureMetaTag({ property: "og:title", content: title });
    }

    metas.forEach((meta) => {
      if (!meta.content || (!meta.name && !meta.property)) return;
      ensureMetaTag(meta);
    });
  }, [title, canonical, metas]);
}
