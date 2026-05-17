import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultUniversalSearchDeps,
  searchAll,
  searchStaticIndex,
  type UniversalSearchResult,
  type UniversalSearchResultKind,
} from "@/services/universalSearch.service";

export type SearchResultType = UniversalSearchResultKind;

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  badge?: string;
  badgeVariant?: "success" | "warning" | "danger" | "info" | "default";
  href: string;
  score: number;
}

export interface SearchGroup {
  type: SearchResultType;
  label: string;
  results: SearchResult[];
}

export type SearchStatus = "idle" | "loading" | "success" | "error";

export interface UseUniversalSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  groups: SearchGroup[];
  totalCount: number;
  status: SearchStatus;
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  flatResults: SearchResult[];
  reset: () => void;
}

const DEBOUNCE_MS = 220;
const MAX_PER_TYPE = 5;
const MIN_QUERY_LEN = 2;
const CACHE_MAX = 30;

const GROUP_ORDER: SearchResultType[] = [
  "action", "vehicle", "page", "setting", "faq", "maintenance", "alert", "guide",
];
const GROUP_LABELS: Record<SearchResultType, string> = {
  vehicle:     "Véhicules",
  maintenance: "Entretiens",
  alert:       "Alertes",
  action:      "Actions rapides",
  page:        "Pages",
  setting:     "Paramètres",
  faq:         "Questions fréquentes",
  guide:       "Guides",
};

const cache = new Map<string, SearchGroup[]>();

function cacheSet(key: string, value: SearchGroup[]): void {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) {
      cache.delete(oldest);
    }
  }
  cache.set(key, value);
}

function mapBadgeVariant(result: UniversalSearchResult): SearchResult["badgeVariant"] {
  if (result.badgeColor === "green") return "success";
  if (result.badgeColor === "yellow") return "warning";
  if (result.badgeColor === "red") return "danger";
  if (result.kind === "alert") return "info";
  return "default";
}

function scoreResult(result: UniversalSearchResult, normalizedQuery: string): number {
  const title = result.title.toLowerCase();
  const subtitle = result.subtitle.toLowerCase();
  const startsWith = title.startsWith(normalizedQuery);
  const inTitle = title.includes(normalizedQuery);
  const inSubtitle = subtitle.includes(normalizedQuery);
  const severityBoost = result.kind === "alert" && result.badge === "critical" ? 2 : 0;
  // Boost léger par weight statique (centré sur 5, contribution ±0.6 max)
  const weightBoost = result.weight !== undefined ? (result.weight - 5) * 0.15 : 0;

  if (startsWith) return 10 + severityBoost + weightBoost;
  if (inTitle)    return  8 + severityBoost + weightBoost;
  if (inSubtitle) return  6 + severityBoost + weightBoost;
  return 5 + severityBoost + weightBoost;
}

function groupResults(
  results: UniversalSearchResult[],
  normalizedQuery: string,
): SearchGroup[] {
  const grouped = new Map<SearchResultType, SearchResult[]>();

  results.forEach((result) => {
    const mapped: SearchResult = {
      id: result.id,
      type: result.kind,
      title: result.title,
      subtitle: result.subtitle,
      badge: result.badge,
      badgeVariant: mapBadgeVariant(result),
      href: result.href,
      score: scoreResult(result, normalizedQuery),
    };
    const current = grouped.get(mapped.type) ?? [];
    current.push(mapped);
    grouped.set(mapped.type, current);
  });

  return GROUP_ORDER.map((type) => {
    const sorted = (grouped.get(type) ?? [])
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_PER_TYPE);
    return {
      type,
      label: GROUP_LABELS[type],
      results: sorted,
    };
  }).filter((group) => group.results.length > 0);
}

async function executeSearch(
  query: string,
  fleetId: string | null,
  signal: AbortSignal,
): Promise<SearchGroup[]> {
  const normalizedQuery = query.toLowerCase().trim();
  const cacheKey = `${fleetId ?? "static"}:${normalizedQuery}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  if (signal.aborted) return [];

  // Recherche statique — instantanée, zéro réseau
  const staticResults = searchStaticIndex(normalizedQuery);

  // Recherche Supabase — uniquement si flotte connue
  let fleetResults: UniversalSearchResult[] = [];
  if (fleetId) {
    fleetResults = await searchAll(
      query,
      { kind: "all" },
      fleetId,
      defaultUniversalSearchDeps,
    );
  }

  if (signal.aborted) return [];

  const grouped = groupResults([...fleetResults, ...staticResults], normalizedQuery);
  cacheSet(cacheKey, grouped);
  return grouped;
}

export function useUniversalSearch(fleetId: string | null): UseUniversalSearchReturn {
  const [query, setQueryRaw] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(
    async (searchQuery: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("loading");
      setSelectedIndex(-1);

      try {
        const result = await executeSearch(searchQuery, fleetId, controller.signal);
        if (!controller.signal.aborted) {
          setGroups(result);
          setStatus("success");
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          setStatus("error");
        }
      }
    },
    [fleetId],
  );

  const setQuery = useCallback(
    (nextQuery: string) => {
      setQueryRaw(nextQuery);
      const trimmed = nextQuery.trim();
      if (trimmed.length < MIN_QUERY_LEN) {
        abortRef.current?.abort();
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        setGroups([]);
        setStatus("idle");
        setSelectedIndex(-1);
        return;
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        void runSearch(trimmed);
      }, DEBOUNCE_MS);
    },
    [fleetId, runSearch],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setQueryRaw("");
    setGroups([]);
    setStatus("idle");
    setSelectedIndex(-1);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const flatResults = useMemo(() => groups.flatMap((group) => group.results), [groups]);
  const totalCount = flatResults.length;

  return {
    query,
    setQuery,
    groups,
    totalCount,
    status,
    selectedIndex,
    setSelectedIndex,
    flatResults,
    reset,
  };
}
