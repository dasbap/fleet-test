import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { HelpRepository } from "@/repositories/help.repository";
import { HelpService } from "@/services/help.service";
import type { HelpArticleCategory, HelpLocale } from "@/types/help";

const helpRepository = new HelpRepository();
const helpService = new HelpService(helpRepository);

const CACHE_KEY = "esamba_help_articles_cache";

function cacheArticles(locale: HelpLocale, articles: unknown): void {
  try {
    localStorage.setItem(
      `${CACHE_KEY}_${locale}`,
      JSON.stringify({ at: Date.now(), articles })
    );
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

export function useHelpArticles(locale: HelpLocale = "fr") {
  return useQuery({
    queryKey: ["help-articles", locale],
    queryFn: async () => {
      const articles = await helpService.getArticles(locale);
      cacheArticles(locale, articles);
      return articles;
    },
    staleTime: 30 * 60 * 1000,
    placeholderData: () => readCachedArticles(locale) ?? undefined,
  });
}

export function useHelpArticle(
  slug: string | undefined,
  locale: HelpLocale = "fr"
) {
  return useQuery({
    queryKey: ["help-article", slug, locale],
    queryFn: () => helpService.getArticleBySlug(slug!, locale),
    enabled: Boolean(slug),
    staleTime: 30 * 60 * 1000,
  });
}

export function useHelpCategoryArticles(
  category: HelpArticleCategory | undefined,
  locale: HelpLocale = "fr"
) {
  return useQuery({
    queryKey: ["help-category", category, locale],
    queryFn: () => helpService.getArticlesByCategory(category!, locale),
    enabled: Boolean(category),
    staleTime: 30 * 60 * 1000,
  });
}

export function usePublicFaqEntries(locale: HelpLocale = "fr") {
  return useQuery({
    queryKey: ["public-faq", locale],
    queryFn: () => helpService.getPublicFaq(locale),
    staleTime: 30 * 60 * 1000,
    placeholderData: () => helpService.getFallbackFaq(locale),
  });
}

export function useAdminFaqEntries(locale: HelpLocale = "fr") {
  return useQuery({
    queryKey: ["admin-faq", locale],
    queryFn: () => helpService.getFaqForAdmin(locale),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveFaqArticle(locale: HelpLocale = "fr") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      id?: string;
      slug: string;
      title: string;
      content: string;
      sort_order: number;
      is_published: boolean;
    }) => helpService.saveFaqArticle({ ...payload, locale }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq", locale] });
      queryClient.invalidateQueries({ queryKey: ["public-faq", locale] });
      queryClient.invalidateQueries({
        queryKey: ["help-category", "faq", locale],
      });
      toast({
        title: "FAQ sauvegardee",
        description: "La question est maintenant enregistree en base.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur FAQ",
        description:
          error instanceof Error
            ? error.message
            : "Impossible de sauvegarder la FAQ.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteFaqArticle(locale: HelpLocale = "fr") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { articleId: string }) =>
      helpService.deleteFaqArticle(payload.articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq", locale] });
      queryClient.invalidateQueries({ queryKey: ["public-faq", locale] });
      queryClient.invalidateQueries({
        queryKey: ["help-category", "faq", locale],
      });
      toast({
        title: "FAQ supprimee",
        description: "La question publique a ete supprimee.",
      });
    },
    onError: (error) => {
      toast({
        title: "Suppression FAQ impossible",
        description:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer la FAQ.",
        variant: "destructive",
      });
    },
  });
}

export function useHelpAnalytics(days = 30) {
  return useQuery({
    queryKey: ["help-analytics", days],
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
      source: "bubble" | "page" | "search" | "error" | "contextual";
      fleetId?: string | null;
    }) => helpService.trackView(articleId, source, fleetId),
  });
}

export { helpService };
