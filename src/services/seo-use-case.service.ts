import { composeUseCaseSlug, buildSeoSystemPrompt } from '@/lib/seo-use-case-prompt';
import { SeoUseCaseRepository } from '@/repositories/seo-use-case.repository';
import {
  seoUseCaseSlugPartsSchema,
  seoUseCaseSlugSchema,
  type SeoUseCaseIndexItem,
  type SeoUseCasePublic,
  type SeoTaxonomyRow,
} from '@/types/seo-use-case';

export interface ParsedUseCaseSlug {
  slug: string;
  outil: string;
  cible: string;
  casUsage: string;
}

/**
 * Logique métier des pages /use-case/ (validation slug, prompt SEO).
 */
export class SeoUseCaseService {
  constructor(private readonly repository: SeoUseCaseRepository) {}

  parseSlug(slug: string): ParsedUseCaseSlug | null {
    const normalized = slug.trim().toLowerCase();
    const slugResult = seoUseCaseSlugSchema.safeParse(normalized);
    if (!slugResult.success) return null;

    const parts = normalized.split('-');
    for (const outilLen of [1, 2] as const) {
      for (const cibleLen of [1, 2, 3] as const) {
        const casLen = parts.length - outilLen - cibleLen;
        if (casLen < 1) continue;

        const outil = parts.slice(0, outilLen).join('-');
        const cible = parts.slice(outilLen, outilLen + cibleLen).join('-');
        const casUsage = parts.slice(outilLen + cibleLen).join('-');
        const candidate = composeUseCaseSlug(outil, cible, casUsage);

        if (candidate !== normalized) continue;

        const parsed = seoUseCaseSlugPartsSchema.safeParse({
          outil,
          cible,
          casUsage,
        });
        if (parsed.success) {
          return { slug: normalized, outil, cible, casUsage };
        }
      }
    }

    return null;
  }

  async getPublishedPage(slug: string): Promise<SeoUseCasePublic | null> {
    const parsed = this.parseSlug(slug);
    if (!parsed) return null;
    return this.repository.findPublishedBySlug(parsed.slug);
  }

  async getPublishedIndex(): Promise<SeoUseCaseIndexItem[]> {
    return this.repository.findAllPublished();
  }

  async getTaxonomy(): Promise<SeoTaxonomyRow[]> {
    return this.repository.findAllTaxonomy();
  }

  buildSystemPrompt(page: SeoUseCasePublic): string {
    return buildSeoSystemPrompt(page);
  }

  getCanonicalPath(slug: string): string {
    return `/use-case/${slug}`;
  }
}
