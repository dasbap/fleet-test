import { createContext } from "react";
import type { UseHelpReturn } from "@/hooks/useHelp";

/** Valeurs sûres — évite tout crash si le contexte est lu avant le Provider. */
export const DEFAULT_HELP_CONTEXT: UseHelpReturn = {
  contextualArticles: [],
  featuredVideos: [],
  allArticles: [],
  searchQuery: "",
  setSearchQuery: () => {},
  searchResults: [],
  isOpen: false,
  openHelp: () => {},
  closeHelp: () => {},
  toggleHelp: () => {},
  expandedId: null,
  toggleArticle: () => {},
  currentPage: null,
  focusedSlug: null,
};

export const HelpContext = createContext<UseHelpReturn>(DEFAULT_HELP_CONTEXT);
