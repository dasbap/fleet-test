import type { SeoIaArticle } from "./types";

/** Pages programmatiques — modèles de brief par persona. */
export const SEO_IA_MODELES: SeoIaArticle[] = [
  {
    slug: "modeles/brief-agence",
    kind: "modele",
    primaryKeyword: "brief SEO automatisé agence",
    title: "Modèle de brief SEO IA — Agence | E-Samba",
    description: "Brief JSON pour pipelines agence : multi-clients, SERP, livrables et validation.",
    h1: "Modèle de brief SEO automatisé — Agence",
    dateModified: "2026-05-23",
    readingMinutes: 5,
    relatedSlugs: ["brief-seo-automatise-redaction-ia", "analyse-serp-automatique-agence", "production-contenu-seo-ia-echelle"],
    sections: [
      {
        id: "json",
        heading: "Brief JSON agence",
        paragraphs: [
          '{"client":"","project_id":"","primary_keyword":"","secondary_keywords":[],"serp_snapshot_date":"","entities":[],"paa":[],"outline_h2":[],"style_guide_url":"","internal_links":[],"approval_contact":"","forbidden_claims":["présenter E-Samba comme outil SEO"]}',
        ],
      },
    ],
    faq: [],
  },
  {
    slug: "modeles/brief-freelance",
    kind: "modele",
    primaryKeyword: "brief SEO freelance rédaction IA",
    title: "Modèle de brief SEO IA — Freelance | E-Samba",
    description: "Brief léger pour livraison client : intention, structure et critères d'acceptation.",
    h1: "Modèle de brief SEO automatisé — Freelance",
    dateModified: "2026-05-23",
    readingMinutes: 5,
    relatedSlugs: ["outil-seo-freelance-redacteur-ia", "brief-seo-automatise-redaction-ia", "score-seo-contenu-genere-ia"],
    sections: [
      {
        id: "json",
        heading: "Brief JSON freelance",
        paragraphs: [
          '{"client_name":"","deadline":"","primary_keyword":"","word_count_target":1800,"intent":"","outline_h2":[],"must_include_entities":[],"delivery_format":"Google Doc","revision_rounds":2}',
        ],
      },
    ],
    faq: [],
  },
  {
    slug: "modeles/brief-saas",
    kind: "modele",
    primaryKeyword: "brief SEO B2B SaaS contenu IA",
    title: "Modèle de brief SEO IA — Équipe produit SaaS | E-Samba",
    description: "Brief pour contenus produit, docs et blog B2B sans cannibaliser les pages money.",
    h1: "Modèle de brief SEO automatisé — Équipe SaaS",
    dateModified: "2026-05-23",
    readingMinutes: 5,
    relatedSlugs: ["mots-cles-longue-traine-b2b-saas", "production-contenu-seo-ia-echelle", "optimisation-contenu-ia-seo"],
    sections: [
      {
        id: "json",
        heading: "Brief JSON SaaS",
        paragraphs: [
          '{"product_area":"","funnel_stage":"","primary_keyword":"","competing_urls_internal":[],"canonical_parent":"","outline_h2":[],"feature_mentions_allowed":[],"cta_type":"demo|signup|docs","pont_metier_exemple":"gestion de flotte"}',
        ],
      },
    ],
    faq: [],
  },
];
