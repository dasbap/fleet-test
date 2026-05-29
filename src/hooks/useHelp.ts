import { useCallback, useEffect, useMemo, useState } from "react";
import type { Location } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export type HelpCategory =
  | "dashboard"
  | "fleet"
  | "creneau"
  | "maintenance"
  | "alerts"
  | "reports"
  | "account"
  | "offline";

export interface HelpArticle {
  id: string;
  category: HelpCategory;
  questionKey: string;
  answerKey: string;
  /** Texte direct (articles DB) — prioritaire sur i18n. */
  questionText?: string;
  answerText?: string;
  videoId?: string;
  videoDuration?: number;
  tags: string[];
}

export interface HelpVideo {
  id: string;
  titleKey: string;
  thumbnailUrl: string;
  duration: number;
  href: string;
}

export interface OpenHelpOptions {
  slug?: string;
}

export interface UseHelpReturn {
  contextualArticles: HelpArticle[];
  featuredVideos: HelpVideo[];
  allArticles: HelpArticle[];

  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: HelpArticle[];

  isOpen: boolean;
  openHelp: (options?: OpenHelpOptions) => void;
  closeHelp: () => void;
  toggleHelp: () => void;

  expandedId: string | null;
  toggleArticle: (id: string) => void;

  currentPage: HelpCategory | null;

  /** Slug article DB ciblé (aide contextuelle). */
  focusedSlug: string | null;
}

// Catalogue complet des articles. Les clés questionKey / answerKey
// pointent vers le namespace i18n "help".

export const ALL_HELP_ARTICLES: HelpArticle[] = [
  // Dashboard
  {
    id: "dash-1",
    category: "dashboard",
    questionKey: "dashboard_q1",
    answerKey: "dashboard_a1",
    tags: ["kpi", "métriques", "tableau", "dashboard", "statistiques"],
  },
  {
    id: "dash-2",
    category: "dashboard",
    questionKey: "dashboard_q2",
    answerKey: "dashboard_a2",
    tags: ["vide", "démarrer", "setup", "premier", "empty"],
  },
  {
    id: "dash-3",
    category: "dashboard",
    questionKey: "dashboard_q3",
    answerKey: "dashboard_a3",
    videoId: "tuto-06",
    videoDuration: 37,
    tags: ["alerte", "résoudre", "action", "1 clic"],
  },

  // Flotte
  {
    id: "fleet-1",
    category: "fleet",
    questionKey: "fleet_q1",
    answerKey: "fleet_a1",
    videoId: "tuto-01",
    videoDuration: 62,
    tags: ["ajouter", "véhicule", "nouveau", "immatriculation", "plaque"],
  },
  {
    id: "fleet-2",
    category: "fleet",
    questionKey: "fleet_q2",
    answerKey: "fleet_a2",
    tags: ["statut", "actif", "entretien", "inactif", "modifier"],
  },
  {
    id: "fleet-3",
    category: "fleet",
    questionKey: "fleet_q3",
    answerKey: "fleet_a3",
    videoId: "tuto-03",
    videoDuration: 31,
    tags: ["qr", "code", "imprimer", "scanner", "terrain"],
  },
  {
    id: "fleet-4",
    category: "fleet",
    questionKey: "fleet_q4",
    answerKey: "fleet_a4",
    tags: ["conducteur", "assigner", "chauffeur", "affecter"],
  },

  // Créneaux
  {
    id: "cren-1",
    category: "creneau",
    questionKey: "creneau_q1",
    answerKey: "creneau_a1",
    videoId: "tuto-01",
    videoDuration: 62,
    tags: ["ouvrir", "créneau", "mission", "démarrer", "kilomètres"],
  },
  {
    id: "cren-2",
    category: "creneau",
    questionKey: "creneau_q2",
    answerKey: "creneau_a2",
    videoId: "tuto-10",
    videoDuration: 64,
    tags: ["offline", "hors-ligne", "clôturer", "sans réseau", "sync"],
  },
  {
    id: "cren-3",
    category: "creneau",
    questionKey: "creneau_q3",
    answerKey: "creneau_a3",
    tags: ["oublié", "rétroactif", "passé", "créneau manqué"],
  },

  // Entretiens
  {
    id: "maint-1",
    category: "maintenance",
    questionKey: "maintenance_q1",
    answerKey: "maintenance_a1",
    videoId: "tuto-07",
    videoDuration: 58,
    tags: ["planifier", "entretien", "vidange", "révision", "prestataire"],
  },
  {
    id: "maint-2",
    category: "maintenance",
    questionKey: "maintenance_q2",
    answerKey: "maintenance_a2",
    tags: ["alerte", "notification", "kilométrage", "échéance", "automatique"],
  },
  {
    id: "maint-3",
    category: "maintenance",
    questionKey: "maintenance_q3",
    answerKey: "maintenance_a3",
    videoId: "tuto-08",
    videoDuration: 46,
    tags: ["historique", "export", "pdf", "excel", "rapport"],
  },

  // Rapports
  {
    id: "rep-1",
    category: "reports",
    questionKey: "reports_q1",
    answerKey: "reports_a1",
    videoId: "tuto-08",
    videoDuration: 46,
    tags: ["rapport", "mensuel", "générer", "export", "pdf"],
  },
  {
    id: "rep-2",
    category: "reports",
    questionKey: "reports_q2",
    answerKey: "reports_a2",
    tags: ["offline", "rapports", "hors-ligne", "cache"],
  },

  // Offline
  {
    id: "off-1",
    category: "offline",
    questionKey: "offline_q1",
    answerKey: "offline_a1",
    videoId: "tuto-10",
    videoDuration: 64,
    tags: ["offline", "hors-ligne", "fonctions", "disponible", "sans réseau"],
  },
  {
    id: "off-2",
    category: "offline",
    questionKey: "offline_q2",
    answerKey: "offline_a2",
    tags: ["sync", "synchronisation", "badge", "file attente", "en attente"],
  },
];

const STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/tutorials`;

const FEATURED_VIDEOS_INTERNAL: HelpVideo[] = [
  {
    id: "tuto-01",
    titleKey: "Ouvrir un créneau",
    thumbnailUrl: `${STORAGE_BASE}/thumbs/tuto-01.svg`,
    duration: 62,
    href: "/aide/videos/tuto-01",
  },
  {
    id: "tuto-03",
    titleKey: "Scanner un QR code véhicule",
    thumbnailUrl: `${STORAGE_BASE}/thumbs/tuto-03.svg`,
    duration: 31,
    href: "/aide/videos/tuto-03",
  },
  {
    id: "tuto-07",
    titleKey: "Planifier un entretien",
    thumbnailUrl: `${STORAGE_BASE}/thumbs/tuto-07.svg`,
    duration: 58,
    href: "/aide/videos/tuto-07",
  },
];

// Mapping route → catégorie. Exporté pour tests unitaires.

export function routeToCategory(pathname: Location["pathname"]): HelpCategory | null {
  // Les routes dashboard spécifiques doivent être testées avant la règle générique "/dashboard".
  if (pathname.startsWith("/dashboard/vehicles")) return "fleet";
  if (pathname.startsWith("/dashboard/closure")) return "creneau";
  if (pathname.startsWith("/dashboard/maintenance")) return "maintenance";
  if (pathname.startsWith("/dashboard/alerts")) return "alerts";
  if (pathname.startsWith("/dashboard/reports")) return "reports";
  if (pathname.startsWith("/dashboard/settings") || pathname.startsWith("/dashboard/profile")) {
    return "account";
  }
  if (pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/dashboard")) {
    return "dashboard";
  }
  if (pathname.startsWith("/flotte")) return "fleet";
  if (pathname.startsWith("/creneaux")) return "creneau";
  if (pathname.startsWith("/entretiens")) return "maintenance";
  if (pathname.startsWith("/alertes")) return "alerts";
  if (pathname.startsWith("/rapports")) return "reports";
  if (pathname.startsWith("/equipe") || pathname.startsWith("/parametres")) {
    return "account";
  }
  return null;
}

// Recherche full‑text locale (tags + question/réponse traduites).
// Exportée pour tests unitaires.

export function searchArticles(
  articles: HelpArticle[],
  query: string,
  t: (key: string, ns: string) => string,
): HelpArticle[] {
  if (!query.trim()) return [];

  const normalizedQuery = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return articles.filter((article) => {
    const tagMatch = article.tags.some((tag) =>
      tag.toLowerCase().includes(normalizedQuery),
    );
    if (tagMatch) return true;

    const question = t(article.questionKey, "help")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (question.includes(normalizedQuery)) return true;

    const answer = t(article.answerKey, "help")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (answer.includes(normalizedQuery)) return true;

    return false;
  });
}

// Exports de compatibilité pour le contexte d'aide partagé.
export const ALL_ARTICLES_EXPORT = ALL_HELP_ARTICLES;
export const FEATURED_VIDEOS_EXPORT = FEATURED_VIDEOS_INTERNAL;
export const searchArticlesHelper = searchArticles;

function trackHelpEvent(event: string, props?: Record<string, unknown>): void {
  try {
    // @ts-expect-error PostHog global
    window.posthog?.capture(event, props);
  } catch {
    // suivi non bloquant
  }
}

const HELP_OPEN_KEY = "esamba_help_seen_v1";

export function useHelp(): UseHelpReturn {
  const location = useLocation();
  const { t } = useTranslation("help");

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQueryRaw] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [focusedSlug] = useState<string | null>(null);

  const currentPage = useMemo(
    () => routeToCategory(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    setIsOpen(false);
    setSearchQueryRaw("");
    setExpandedId(null);
  }, [location.pathname]);

  const contextualArticles = useMemo(() => {
    if (!currentPage) {
      return ALL_HELP_ARTICLES.slice(0, 4);
    }
    return ALL_HELP_ARTICLES.filter((article) => article.category === currentPage);
  }, [currentPage]);

  const setSearchQuery = useCallback(
    (q: string) => {
      setSearchQueryRaw(q);
      if (q.length >= 2) {
        trackHelpEvent("help_searched", { query: q, page: currentPage });
      }
    },
    [currentPage],
  );

  const searchResults = useMemo(() => {
    if (searchQuery.trim().length < 2) return [];
    return searchArticles(ALL_HELP_ARTICLES, searchQuery, (key, ns) =>
      t(key, { ns }),
    );
  }, [searchQuery, t]);

  const openHelp = useCallback((options?: OpenHelpOptions) => {
    setIsOpen(true);
    try {
      window.localStorage.setItem(HELP_OPEN_KEY, "true");
    } catch {
      // localStorage indisponible (mode privé, etc.)
    }
    trackHelpEvent("help_opened", { page: currentPage, slug: options?.slug });
  }, [currentPage]);

  const closeHelp = useCallback(() => {
    setIsOpen(false);
    trackHelpEvent("help_closed", { page: currentPage });
  }, [currentPage]);

  const toggleHelp = useCallback(
    () => (isOpen ? closeHelp() : openHelp()),
    [isOpen, openHelp, closeHelp],
  );

  const toggleArticle = useCallback(
    (id: string) => {
      setExpandedId((prev) => {
        const next = prev === id ? null : id;
        if (next) {
          const article = ALL_HELP_ARTICLES.find((a) => a.id === id);
          trackHelpEvent("help_article_expanded", {
            article_id: id,
            category: article?.category,
            page: currentPage,
          });
        }
        return next;
      });
    },
    [currentPage],
  );

  return {
    contextualArticles,
    featuredVideos: FEATURED_VIDEOS_INTERNAL,
    allArticles: ALL_HELP_ARTICLES,
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
  };
}

