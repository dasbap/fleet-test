import { supabase } from '@/integrations/supabase/client';
import {
  seoTaxonomyRowSchema,
  seoUseCaseRowSchema,
  stringArrayJsonSchema,
  type SeoTaxonomyRow,
  type SeoUseCaseIndexItem,
  type SeoUseCasePublic,
  type SeoUseCaseRow,
} from '@/types/seo-use-case';

const USE_CASE_SELECT = `
  id,
  slug,
  outil,
  cible,
  cas_usage,
  status,
  published_at,
  title,
  meta_description,
  h1,
  intro,
  body_md,
  intention,
  kw_principal,
  secteur,
  entites,
  paa,
  structure_serp,
  cta_label,
  cta_href,
  created_at,
  updated_at
`;

function parseJsonStringArray(value: unknown): string[] {
  const parsed = stringArrayJsonSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

function mapUseCaseRow(raw: Record<string, unknown>): SeoUseCaseRow {
  return seoUseCaseRowSchema.parse({
    ...raw,
    entites: parseJsonStringArray(raw.entites),
    paa: parseJsonStringArray(raw.paa),
    structure_serp: parseJsonStringArray(raw.structure_serp),
  });
}

function labelForSlug(
  taxonomy: SeoTaxonomyRow[],
  slug: string
): string {
  return taxonomy.find((t) => t.slug === slug)?.label_fr ?? slug;
}

/**
 * Accès Supabase aux pages use-case marketing (lecture publique via RLS).
 */
export class SeoUseCaseRepository {
  async findAllTaxonomy(): Promise<SeoTaxonomyRow[]> {
    const { data, error } = await supabase
      .from('seo_taxonomy')
      .select('slug, kind, label_fr, description_fr')
      .order('kind')
      .order('label_fr');

    if (error) {
      console.error('Erreur chargement seo_taxonomy:', error);
      throw new Error('Impossible de charger la taxonomie des cas d’usage.');
    }

    return (data ?? []).map((row) => seoTaxonomyRowSchema.parse(row));
  }

  async findPublishedBySlug(slug: string): Promise<SeoUseCasePublic | null> {
    const { data, error } = await supabase
      .from('seo_use_cases')
      .select(USE_CASE_SELECT)
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Erreur chargement seo_use_cases:', error);
      throw new Error('Impossible de charger ce cas d’usage.');
    }

    if (!data) return null;

    const row = mapUseCaseRow(data as Record<string, unknown>);
    const taxonomy = await this.findAllTaxonomy();

    return {
      ...row,
      outil_label: labelForSlug(taxonomy, row.outil),
      cible_label: labelForSlug(taxonomy, row.cible),
      cas_usage_label: labelForSlug(taxonomy, row.cas_usage),
    };
  }

  async findAllPublished(): Promise<SeoUseCaseIndexItem[]> {
    const { data, error } = await supabase
      .from('seo_use_cases')
      .select(USE_CASE_SELECT)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Erreur liste seo_use_cases:', error);
      throw new Error('Impossible de charger les cas d’usage.');
    }

    const taxonomy = await this.findAllTaxonomy();
    const rows = (data ?? []).map((raw) => mapUseCaseRow(raw as Record<string, unknown>));

    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      meta_description: row.meta_description,
      h1: row.h1,
      intro: row.intro,
      outil: row.outil,
      cible: row.cible,
      cas_usage: row.cas_usage,
      outil_label: labelForSlug(taxonomy, row.outil),
      cible_label: labelForSlug(taxonomy, row.cible),
      cas_usage_label: labelForSlug(taxonomy, row.cas_usage),
      published_at: row.published_at,
    }));
  }

  async findPublishedSlugs(): Promise<Array<{ slug: string; title: string; meta_description: string }>> {
    const { data, error } = await supabase
      .from('seo_use_cases')
      .select('slug, title, meta_description')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Erreur slugs seo_use_cases:', error);
      throw new Error('Impossible de charger les URLs des cas d’usage.');
    }

    return (data ?? []).map((row) => ({
      slug: String(row.slug),
      title: String(row.title),
      meta_description: String(row.meta_description),
    }));
  }
}
