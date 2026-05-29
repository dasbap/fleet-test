import { useState, useMemo, useEffect, useRef } from 'react';
import { helpService } from '@/hooks/useHelpArticles';
import { useHelpSearchHistory } from '@/hooks/useHelpSearchHistory';
import type { HelpArticleRecord, HelpUserContext } from '@/types/help';
import type { HelpSearchResult } from '@/services/help.service';

export function useHelpSearchUnified(
  articles: HelpArticleRecord[],
  ctx?: HelpUserContext,
  fleetId?: string | null,
) {
  const [query, setQuery] = useState('');
  const { addToHistory } = useHelpSearchHistory();
  const lastTracked = useRef('');

  const results: HelpSearchResult[] = useMemo(() => {
    if (query.trim().length < 2) return [];
    return helpService.searchArticles(articles, query, ctx);
  }, [articles, query, ctx]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed === lastTracked.current) return;

    const timer = setTimeout(() => {
      lastTracked.current = trimmed;
      addToHistory(trimmed);
      void helpService.trackSearch(trimmed, results.length, fleetId);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, results.length, addToHistory, fleetId]);

  return {
    query,
    setQuery,
    results,
    isSearching: query.trim().length >= 2,
  };
}
