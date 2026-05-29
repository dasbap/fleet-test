import { useState, useCallback } from 'react';

const SEARCH_HISTORY_KEY = 'esamba_help_search_history';
const MAX_HISTORY = 10;

export function useHelpSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((q) => q !== trimmed)].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // localStorage indisponible
      }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { history, addToHistory, clearHistory };
}
