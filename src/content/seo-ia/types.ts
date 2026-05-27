import type { FaqItem } from "../../types/faq";

/** Section d'article pour rendu structuré (GEO : réponse directe après H2). */
export interface SeoIaSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export type SeoIaArticleKind = "hub" | "pillar" | "cluster" | "modele";

export interface SeoIaArticle {
  slug: string;
  kind: SeoIaArticleKind;
  primaryKeyword: string;
  title: string;
  description: string;
  h1: string;
  dateModified: string;
  readingMinutes: number;
  /** Slug du pilier parent (articles cluster). */
  pillarSlug?: string;
  /** Maillage triangle : 2 articles liés du même cluster. */
  relatedSlugs: string[];
  sections: SeoIaSection[];
  faq: FaqItem[];
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  /** Bloc lead magnet (templates, checklist). */
  leadMagnet?: { title: string; body: string };
}
