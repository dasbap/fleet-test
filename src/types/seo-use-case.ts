import { z } from 'zod';

export const SEO_TAXONOMY_KINDS = ['outil', 'cible', 'cas_usage'] as const;
export type SeoTaxonomyKind = (typeof SEO_TAXONOMY_KINDS)[number];

export const SEO_OUTILS = ['esamba', 'cursor', 'n8n', 'mobile', 'api'] as const;
export const SEO_CIBLES = [
  'transporteur-pme',
  'logistique-cemac',
  'saas-b2b',
  'startup',
  'growth',
] as const;
export const SEO_CAS_USAGE = [
  'maintenance-predictive',
  'dvir-inspections',
  'transit-cemac',
  'alertes-flotte',
  'rapports-pdf',
] as const;

export type SeoOutil = (typeof SEO_OUTILS)[number];
export type SeoCible = (typeof SEO_CIBLES)[number];
export type SeoCasUsage = (typeof SEO_CAS_USAGE)[number];

export const seoUseCaseSlugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+){2,}$/, 'Slug use-case invalide');

export const seoUseCaseSlugPartsSchema = z.object({
  outil: z.enum(SEO_OUTILS),
  cible: z.enum(SEO_CIBLES),
  casUsage: z.enum(SEO_CAS_USAGE),
});

export const stringArrayJsonSchema = z.array(z.string());

export const seoTaxonomyRowSchema = z.object({
  slug: z.string(),
  kind: z.enum(SEO_TAXONOMY_KINDS),
  label_fr: z.string(),
  description_fr: z.string().nullable(),
});

export const seoUseCaseRowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  outil: z.string(),
  cible: z.string(),
  cas_usage: z.string(),
  status: z.enum(['draft', 'published']),
  published_at: z.string().nullable(),
  title: z.string(),
  meta_description: z.string(),
  h1: z.string(),
  intro: z.string(),
  body_md: z.string(),
  intention: z.string(),
  kw_principal: z.string(),
  secteur: z.string(),
  entites: stringArrayJsonSchema,
  paa: stringArrayJsonSchema,
  structure_serp: stringArrayJsonSchema,
  cta_label: z.string(),
  cta_href: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type SeoTaxonomyRow = z.infer<typeof seoTaxonomyRowSchema>;
export type SeoUseCaseRow = z.infer<typeof seoUseCaseRowSchema>;

/** Page publiée avec libellés taxonomie pour l’affichage. */
export interface SeoUseCasePublic extends SeoUseCaseRow {
  outil_label: string;
  cible_label: string;
  cas_usage_label: string;
}

export interface SeoUseCaseIndexItem {
  slug: string;
  title: string;
  meta_description: string;
  h1: string;
  intro: string;
  outil: string;
  cible: string;
  cas_usage: string;
  outil_label: string;
  cible_label: string;
  cas_usage_label: string;
  published_at: string | null;
}
