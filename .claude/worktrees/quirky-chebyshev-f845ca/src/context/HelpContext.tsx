import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type {
  UseHelpReturn,
  HelpArticle,
  HelpCategory,
  HelpVideo,
} from "@/hooks/useHelp";
import {
  ALL_ARTICLES_EXPORT as ALL_ARTICLES,
  FEATURED_VIDEOS_EXPORT as FEATURED_VIDEOS,
  routeToCategory,
  searchArticlesHelper,
} from "@/hooks/useHelp";

const HelpContext = createContext<UseHelpReturn | null>(null);
type PosthogWindow = Window & {
  posthog?: { capture: (event: string, props?: Record<string, unknown>) => void };
};

export function HelpProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { t } = useTranslation("help");

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchRaw] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const currentPage = useMemo(
    () => routeToCategory(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    setIsOpen(false);
    setSearchRaw("");
    setExpandedId(null);
  }, [location.pathname]);

  const contextualArticles = useMemo(
    () =>
      !currentPage
        ? ALL_ARTICLES.slice(0, 4)
        : ALL_ARTICLES.filter((a: HelpArticle) => a.category === currentPage),
    [currentPage],
  );

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

  const searchResults = useMemo(
    () =>
      searchQuery.trim().length < 2
        ? []
        : searchArticlesHelper(ALL_ARTICLES, searchQuery, (key: string, ns: string) =>
            t(key, { ns }),
          ),
    [searchQuery, t],
  );

  const openHelp = useCallback(() => {
    setIsOpen(true);
    try {
      (window as PosthogWindow).posthog?.capture("help_opened", { page: currentPage });
    } catch {
      // Suivi analytics non bloquant.
    }
  }, [currentPage]);

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
      }
      return next;
    });
  }, []);

  const value = useMemo<UseHelpReturn>(
    () => ({
      contextualArticles,
      featuredVideos: FEATURED_VIDEOS,
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
    }),
    [
      contextualArticles,
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
    ],
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelpContext(): UseHelpReturn {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error("useHelpContext must be used within HelpProvider");
  return ctx;
}
