import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { HelpRepository } from '@/repositories/help.repository';
import { HelpService } from '@/services/help.service';
import type { HelpArticleCategory, HelpLocale } from '@/types/help';

const helpRepository = new HelpRepository();
const helpService = new HelpService(helpRepository);

const CACHE_KEY = 'esamba_help_articles_cache';

function cacheArticles(locale: HelpLocale, articles: unknown): void {
  try {
    localStorage.setItem(`${CACHE_KEY}_${locale}`, JSON.stringify({ at: Date.now(), articles }));
  } catch {
    // localStorage indisponible
  }
}

function readCachedArticles(locale: HelpLocale): unknown | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${locale}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; articles: unknown };
    // Cache 24h
    if (Date.now() - parsed.at > 24 * 60 * 60 * 1000) return null;
    return parsed.articles;
  } catch {
    return null;
  }
}

export function useHelpArticles(locale: HelpLocale = 'fr') {
  return useQuery({
    queryKey: ['help-articles', locale],
    queryFn: async () => {
      const articles = await helpService.getArticles(locale);
      cacheArticles(locale, articles);
      return articles;
    },
    staleTime: 30 * 60 * 1000,
    placeholderData: () => readCachedArticles(locale) ?? undefined,
  });
}

export function useHelpArticle(slug: string | undefined, locale: HelpLocale = 'fr') {
  return useQuery({
    queryKey: ['help-article', slug, locale],
    queryFn: () => helpService.getArticleBySlug(slug!, locale),
    enabled: Boolean(slug),
    staleTime: 30 * 60 * 1000,
  });
}

export function useHelpCategoryArticles(
  category: HelpArticleCategory | undefined,
  locale: HelpLocale = 'fr',
) {
  return useQuery({
    queryKey: ['help-category', category, locale],
    queryFn: () => helpService.getArticlesByCategory(category!, locale),
    enabled: Boolean(category),
    staleTime: 30 * 60 * 1000,
  });
}

export function useHelpAnalytics(days = 30) {
  return useQuery({
    queryKey: ['help-analytics', days],
    queryFn: () => helpService.getAnalytics(days),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrackHelpView() {
  return useMutation({
    mutationFn: ({
      articleId,
      source,
      fleetId,
    }: {
      articleId: string;
      source: 'bubble' | 'page' | 'search' | 'error' | 'contextual';
      fleetId?: string | null;
    }) => helpService.trackView(articleId, source, fleetId),
  });
}

export { helpService };
