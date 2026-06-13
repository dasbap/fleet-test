import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

import type {
  UseHelpReturn,
  HelpArticle,
  HelpCategory,
} from "@/hooks/useHelp";
import {
  ALL_ARTICLES_EXPORT as ALL_ARTICLES,
  FEATURED_VIDEOS_EXPORT as FEATURED_VIDEOS,
  routeToCategory,
  searchArticlesHelper,
} from "@/hooks/useHelp";
import { HelpContext } from "@/context/help.context.store";
import { useHelpArticles, helpService } from "@/hooks/useHelpArticles";
import { useAuthOptional } from "@/hooks/useAuth";
import { useFleetBillingContext } from "@/hooks/useFleetBillingContext";
import type { HelpLocale, HelpUserContext } from "@/types/help";
import type { AppRole } from "@/types/auth";
import { getSignedStorageUrl } from "@/lib/storage/signedUrl";
import type { HelpVideo } from "@/hooks/useHelp";

type PosthogWindow = Window & {
  posthog?: { capture: (event: string, props?: Record<string, unknown>) => void };
};

function resolveLocale(): HelpLocale {
  const lang = i18n.language?.slice(0, 2);
  if (lang === "en" || lang === "ln") return lang;
  return "fr";
}

export function HelpProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { t } = useTranslation("help");
  const auth = useAuthOptional();
  const role = auth?.role ?? null;
  const userFleetId = auth?.userFleetId ?? null;
  const locale = resolveLocale();
  const { data: dbArticlesRaw } = useHelpArticles(locale);
  const dbArticles = dbArticlesRaw ?? [];
  const billingQuery = useFleetBillingContext(userFleetId ?? undefined);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchRaw] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
  const [featuredVideos, setFeaturedVideos] = useState<HelpVideo[]>(FEATURED_VIDEOS);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resolved = await Promise.all(
        FEATURED_VIDEOS.map(async (video) => {
          const match = video.thumbnailUrl.match(/\/tutorials\/(.+)$/);
          const objectPath = match?.[1];
          if (!objectPath) return video;
          const signed = await getSignedStorageUrl("tutorials", decodeURIComponent(objectPath));
          return signed ? { ...video, thumbnailUrl: signed } : video;
        }),
      );
      if (!cancelled) setFeaturedVideos(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentPage = useMemo(
    () => routeToCategory(location.pathname),
    [location.pathname],
  );

  const helpCtx: HelpUserContext = useMemo(
    () => ({
      role: (role ?? "organizer") as AppRole,
      planCode: billingQuery.data?.planCode ?? "free",
      billingFlags: {
        financeEnabled: billingQuery.data?.financeEnabled ?? false,
        reportsEnabled: billingQuery.data?.reportsEnabled ?? false,
        aiEnabled: billingQuery.data?.aiEnabled ?? false,
        driverScoringEnabled: billingQuery.data?.driverScoringEnabled ?? false,
      },
      pathname: location.pathname,
      locale,
    }),
    [role, billingQuery.data, location.pathname, locale],
  );

  useEffect(() => {
    setIsOpen(false);
    setSearchRaw("");
    setExpandedId(null);
    setFocusedSlug(null);
  }, [location.pathname]);

  const contextualDbArticles = useMemo(() => {
    const filtered = helpService.filterForUser(dbArticles, helpCtx);
    const routeSlug = helpService.resolveRouteSlug(location.pathname);
    if (focusedSlug) {
      const focused = filtered.find((a) => a.slug === focusedSlug);
      if (focused) return [focused, ...filtered.filter((a) => a.slug !== focusedSlug)].slice(0, 6);
    }
    if (routeSlug) {
      const primary = filtered.find((a) => a.slug === routeSlug);
      if (primary) return [primary, ...filtered.filter((a) => a.slug !== routeSlug)].slice(0, 6);
    }
    return helpService.getContextualArticles(dbArticles, location.pathname, helpCtx);
  }, [dbArticles, helpCtx, location.pathname, focusedSlug]);

  const contextualArticles = useMemo((): HelpArticle[] => {
    if (contextualDbArticles.length > 0) {
      return contextualDbArticles.map((a) => ({
        id: a.id,
        category: (currentPage ?? "dashboard") as HelpCategory,
        questionKey: a.slug,
        answerKey: a.slug,
        questionText: a.title,
        answerText: a.content,
        tags: a.keywords,
      }));
    }
    if (!currentPage) return ALL_ARTICLES.slice(0, 4);
    return ALL_ARTICLES.filter((a: HelpArticle) => a.category === currentPage);
  }, [contextualDbArticles, currentPage]);

  const setSearchQuery = useCallback((q: string) => {
    setSearchRaw(q);
    if (q.length >= 2) {
      try {
        (window as PosthogWindow).posthog?.capture("help_searched", { query: q });
      } catch {
        // Suivi analytics non bloquant.
      }
    }
  }, []);

  const dbSearchResults = useMemo(() => {
    if (searchQuery.trim().length < 2) return [];
    return helpService.searchArticles(dbArticles, searchQuery, helpCtx);
  }, [searchQuery, dbArticles, helpCtx]);

  const searchResults = useMemo((): HelpArticle[] => {
    if (searchQuery.trim().length < 2) return [];

    if (dbSearchResults.length > 0) {
      return dbSearchResults.map(({ article }) => ({
        id: article.id,
        category: (currentPage ?? "dashboard") as HelpCategory,
        questionKey: article.slug,
        answerKey: article.slug,
        questionText: article.title,
        answerText: article.content,
        tags: article.keywords,
      }));
    }

    return searchArticlesHelper(ALL_ARTICLES, searchQuery, (key: string, ns: string) =>
      t(key, { ns }),
    );
  }, [searchQuery, dbSearchResults, currentPage, t]);

  const openHelp = useCallback(
    (options?: { slug?: string }) => {
      if (options?.slug) setFocusedSlug(options.slug);
      setIsOpen(true);
      try {
        (window as PosthogWindow).posthog?.capture("help_opened", {
          page: currentPage,
          slug: options?.slug,
        });
      } catch {
        // Suivi analytics non bloquant.
      }
    },
    [currentPage],
  );

  const closeHelp = useCallback(() => setIsOpen(false), []);
  const toggleHelp = useCallback(
    () => (isOpen ? closeHelp() : openHelp()),
    [isOpen, openHelp, closeHelp],
  );

  const toggleArticle = useCallback((id: string) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next) {
        try {
          (window as PosthogWindow).posthog?.capture("help_article_expanded", {
            article_id: id,
          });
        } catch {
          // Suivi analytics non bloquant.
        }
        const dbArticle = dbArticles.find((a) => a.id === id);
        if (dbArticle && !id.startsWith("fallback-")) {
          void helpService.trackView(id, "bubble", userFleetId);
        }
      }
      return next;
    });
  }, [dbArticles, userFleetId]);

  const value = useMemo<UseHelpReturn>(
    () => ({
      contextualArticles,
      featuredVideos,
      allArticles: ALL_ARTICLES,
      searchQuery,
      setSearchQuery,
      searchResults,
      isOpen,
      openHelp,
      closeHelp,
      toggleHelp,
      expandedId,
      toggleArticle,
      currentPage: currentPage as HelpCategory | null,
      focusedSlug,
    }),
    [
      contextualArticles,
      featuredVideos,
      searchQuery,
      setSearchQuery,
      searchResults,
      isOpen,
      openHelp,
      closeHelp,
      toggleHelp,
      expandedId,
      toggleArticle,
      currentPage,
      focusedSlug,
    ],
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}
