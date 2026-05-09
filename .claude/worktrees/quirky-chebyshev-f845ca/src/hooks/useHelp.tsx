import type { ReactNode } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { loadHelpNamespace } from "@/i18n/helpNamespace";

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
  videoId?: string;
  videoDuration?: number;
}

export interface HelpVideo {
  id: string;
  titleKey: string;
  thumbnailUrl: string;
  duration: number;
  href: string;
}

interface HelpContextValue {
  isOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  expandedId: string | null;
  toggleArticle: (id: string | null) => void;
  currentPage: HelpCategory | null;
  contextualArticles: HelpArticle[];
  searchResults: HelpArticle[];
  featuredVideos: HelpVideo[];
}

const HelpContext = createContext<HelpContextValue | undefined>(undefined);

const ROUTE_CATEGORY_MAP: Array<{ match: (pathname: string) => boolean; category: HelpCategory }> =
  [
    {
      match: (pathname) => pathname.startsWith("/dashboard/vehicles"),
      category: "fleet",
    },
    {
      match: (pathname) => pathname.startsWith("/dashboard/closure"),
      category: "creneau",
    },
    {
      match: (pathname) => pathname.startsWith("/dashboard/maintenance"),
      category: "maintenance",
    },
    {
      match: (pathname) => pathname.startsWith("/dashboard/alerts"),
      category: "alerts",
    },
    {
      match: (pathname) => pathname.startsWith("/dashboard/reports"),
      category: "reports",
    },
    {
      match: (pathname) =>
        pathname.startsWith("/dashboard/settings") ||
        pathname.startsWith("/dashboard/profile"),
      category: "account",
    },
    {
      match: (pathname) => pathname.startsWith("/offline"),
      category: "offline",
    },
    {
      match: (pathname) =>
        pathname === "/" ||
        pathname === "/dashboard" ||
        pathname.startsWith("/dashboard"),
      category: "dashboard",
    },
  ];

const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "dashboard-overview",
    category: "dashboard",
    questionKey: "articles.dashboard_overview.question",
    answerKey: "articles.dashboard_overview.answer",
    videoId: "dashboard-intro",
    videoDuration: 120,
  },
  {
    id: "fleet-add-vehicle",
    category: "fleet",
    questionKey: "articles.fleet_add_vehicle.question",
    answerKey: "articles.fleet_add_vehicle.answer",
    videoId: "fleet-add-vehicle",
    videoDuration: 180,
  },
  {
    id: "maintenance-plan",
    category: "maintenance",
    questionKey: "articles.maintenance_plan.question",
    answerKey: "articles.maintenance_plan.answer",
    videoId: "maintenance-plan",
    videoDuration: 150,
  },
  {
    id: "alerts-understand",
    category: "alerts",
    questionKey: "articles.alerts_understand.question",
    answerKey: "articles.alerts_understand.answer",
    videoId: "alerts-understand",
    videoDuration: 210,
  },
  {
    id: "reports-export",
    category: "reports",
    questionKey: "articles.reports_export.question",
    answerKey: "articles.reports_export.answer",
  },
  {
    id: "account-team",
    category: "account",
    questionKey: "articles.account_team.question",
    answerKey: "articles.account_team.answer",
  },
];

const FEATURED_VIDEOS: HelpVideo[] = [
  {
    id: "dashboard-intro",
    titleKey: "videos.dashboard_intro",
    thumbnailUrl: "/images/help/dashboard-intro.jpg",
    duration: 120,
    href: "/aide/videos/dashboard-intro",
  },
  {
    id: "fleet-add-vehicle",
    titleKey: "videos.fleet_add_vehicle",
    thumbnailUrl: "/images/help/fleet-add-vehicle.jpg",
    duration: 180,
    href: "/aide/videos/fleet-add-vehicle",
  },
  {
    id: "maintenance-plan",
    titleKey: "videos.maintenance_plan",
    thumbnailUrl: "/images/help/maintenance-plan.jpg",
    duration: 150,
    href: "/aide/videos/maintenance-plan",
  },
];

interface HelpProviderProps {
  children: ReactNode;
}

export const HelpProvider = ({ children }: HelpProviderProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation("help");

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const currentPage: HelpCategory | null = useMemo(() => {
    const match = ROUTE_CATEGORY_MAP.find((entry) => entry.match(pathname));
    return match ? match.category : null;
  }, [pathname]);

  const contextualArticles = useMemo(() => {
    if (!currentPage) {
      return HELP_ARTICLES;
    }
    return HELP_ARTICLES.filter((article) => article.category === currentPage);
  }, [currentPage]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2) {
      return [];
    }

    return HELP_ARTICLES.filter((article) => {
      const question = t(article.questionKey).toString().toLowerCase();
      const answer = t(article.answerKey).toString().toLowerCase();
      return question.includes(query) || answer.includes(query);
    });
  }, [searchQuery, t]);

  const openHelp = useCallback(async () => {
    await loadHelpNamespace();
    setIsOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleHelp = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSetSearchQuery = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const toggleArticle = useCallback(
    (id: string | null) => {
      setExpandedId((current) => (current === id ? null : id));
    },
    [],
  );

  const value: HelpContextValue = {
    isOpen,
    openHelp,
    closeHelp,
    toggleHelp,
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
    expandedId,
    toggleArticle,
    currentPage,
    contextualArticles,
    searchResults,
    featuredVideos: FEATURED_VIDEOS,
  };

  return (
    <HelpContext.Provider value={value}>
      {children}
    </HelpContext.Provider>
  );
};

export const useHelp = (): HelpContextValue => {
  const context = useContext(HelpContext);

  if (!context) {
    throw new Error("useHelp must be used within a HelpProvider");
  }

  return context;
};

