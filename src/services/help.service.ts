import { HelpRepository } from '@/repositories/help.repository';
import {
  HELP_ARTICLES_SEED_FR,
  HELP_ARTICLES_SEED_EN,
  HELP_ARTICLES_SEED_LN,
} from '@/data/help/articles.seed';
import { HELP_ROUTE_DEFAULTS } from '@/types/help';
import type {
  HelpArticleRecord,
  HelpArticleCategory,
  HelpLocale,
  HelpUserContext,
  HelpViewSource,
} from '@/types/help';
import type { AppRole } from '@/types/auth';

const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  organizer: 2,
  enterprise: 3,
};

/** Normalise une chaîne pour recherche (déaccentuation). */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}

/** Distance Levenshtein simplifiée pour fuzzy match court. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

export interface HelpSearchResult {
  article: HelpArticleRecord;
  score: number;
}

export class HelpService {
  constructor(private repository: HelpRepository) {}

  /** Articles statiques de repli si Supabase indisponible. */
  getFallbackArticles(locale: HelpLocale = 'fr'): HelpArticleRecord[] {
    const seeds =
      locale === 'en'
        ? HELP_ARTICLES_SEED_EN
        : locale === 'ln'
          ? HELP_ARTICLES_SEED_LN
          : HELP_ARTICLES_SEED_FR;

    return seeds.map((s, i) => ({
      id: `fallback-${s.slug}-${locale}`,
      slug: s.slug,
      title: s.title,
      category: s.category,
      role: s.role ?? [],
      locale: s.locale ?? locale,
      keywords: s.keywords ?? [],
      content: s.content,
      route_context: s.route_context ?? [],
      plan_min: s.plan_min ?? null,
      module_keys: s.module_keys ?? [],
      error_codes: s.error_codes ?? [],
      sort_order: s.sort_order ?? i,
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  async getArticles(locale: HelpLocale = 'fr'): Promise<HelpArticleRecord[]> {
    try {
      const articles = await this.repository.findPublished(locale);
      return articles.length > 0 ? articles : this.getFallbackArticles(locale);
    } catch {
      return this.getFallbackArticles(locale);
    }
  }

  async getArticleBySlug(
    slug: string,
    locale: HelpLocale = 'fr',
  ): Promise<HelpArticleRecord | null> {
    try {
      const article = await this.repository.findBySlug(slug, locale);
      if (article) return article;
      return this.getFallbackArticles(locale).find((a) => a.slug === slug) ?? null;
    } catch {
      return this.getFallbackArticles(locale).find((a) => a.slug === slug) ?? null;
    }
  }

  async getArticlesByCategory(
    category: HelpArticleCategory,
    locale: HelpLocale = 'fr',
  ): Promise<HelpArticleRecord[]> {
    try {
      const articles = await this.repository.findByCategory(category, locale);
      if (articles.length > 0) return articles;
      return this.getFallbackArticles(locale).filter((a) => a.category === category);
    } catch {
      return this.getFallbackArticles(locale).filter((a) => a.category === category);
    }
  }

  /** Filtre articles selon rôle, plan et modules activés. */
  filterForUser(articles: HelpArticleRecord[], ctx: HelpUserContext): HelpArticleRecord[] {
    const userPlanRank = PLAN_RANK[ctx.planCode] ?? 0;

    return articles.filter((article) => {
      if (article.role.length > 0 && !article.role.includes(ctx.role)) {
        return false;
      }

      if (article.plan_min) {
        const requiredRank = PLAN_RANK[article.plan_min] ?? 0;
        if (userPlanRank < requiredRank) {
          // Article visible avec restriction — on le garde pour badge « Plan requis »
        }
      }

      if (article.module_keys.length > 0) {
        const allEnabled = article.module_keys.every(
          (key) => ctx.billingFlags[key] === true,
        );
        if (!allEnabled) return false;
      }

      return true;
    });
  }

  getContextualArticles(
    articles: HelpArticleRecord[],
    pathname: string,
    ctx: HelpUserContext,
  ): HelpArticleRecord[] {
    const filtered = this.filterForUser(articles, ctx);
    const routeMatches = filtered.filter((a) =>
      a.route_context.some((r) => pathname.startsWith(r)),
    );
    if (routeMatches.length > 0) return routeMatches.slice(0, 6);
    return filtered.slice(0, 6);
  }

  resolveRouteSlug(pathname: string): string | null {
    for (const { pattern, slug } of HELP_ROUTE_DEFAULTS) {
      if (pattern.test(pathname)) return slug;
    }
    return null;
  }

  searchArticles(
    articles: HelpArticleRecord[],
    query: string,
    ctx?: HelpUserContext,
  ): HelpSearchResult[] {
    const q = normalizeSearchText(query).split(/\s+/).filter(Boolean);
    if (q.length === 0) return [];

    const pool = ctx ? this.filterForUser(articles, ctx) : articles;
    const results: HelpSearchResult[] = [];

    for (const article of pool) {
      const haystack = normalizeSearchText(
        [article.title, article.content, ...article.keywords].join(' '),
      );
      let score = 0;

      for (const word of q) {
        if (haystack.includes(word)) {
          score += haystack.startsWith(word) ? 3 : 1;
          continue;
        }
        // Fuzzy : tolérance sur mots courts
        const tokens = haystack.split(/\s+/).filter((t) => t.length >= 3);
        for (const token of tokens) {
          if (token.includes(word) || levenshtein(token.slice(0, word.length + 2), word) <= 1) {
            score += 0.5;
            break;
          }
        }
      }

      if (score > 0) {
        results.push({ article, score });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  async getArticleForError(
    errorCode: string,
    locale: HelpLocale = 'fr',
  ): Promise<HelpArticleRecord | null> {
    try {
      const article = await this.repository.findByErrorCode(errorCode, locale);
      if (article) return article;
    } catch {
      // repli statique
    }
    return (
      this.getFallbackArticles(locale).find((a) =>
        a.error_codes.includes(errorCode),
      ) ?? null
    );
  }

  async trackView(
    articleId: string,
    source: HelpViewSource,
    fleetId?: string | null,
  ): Promise<void> {
    if (articleId.startsWith('fallback-')) return;
    await this.repository.recordView(articleId, { source, fleet_id: fleetId });
  }

  async trackSearch(
    query: string,
    resultsCount: number,
    fleetId?: string | null,
  ): Promise<void> {
    await this.repository.recordSearchEvent({
      query,
      results_count: resultsCount,
      had_results: resultsCount > 0,
      fleet_id: fleetId,
    });
  }

  async getAnalytics(days = 30): Promise<Record<string, unknown>> {
    return this.repository.getAnalyticsSummary(days);
  }

  /** Mappe rôle guide FR vers AppRole. */
  static guideRoleToAppRole(guideRole: string): AppRole | null {
    const map: Record<string, AppRole> = {
      chauffeur: 'driver',
      gestionnaire: 'manager',
      mécanicien: 'mechanic',
      organisateur: 'organizer',
    };
    return map[guideRole] ?? null;
  }
}
