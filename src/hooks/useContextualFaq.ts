/**
 * Hook principal — FAQ contextuelle E-Samba.
 *
 * Résout automatiquement :
 *   - la route FAQ depuis l'URL courante
 *   - la locale active (depuis localStorage ou navigator.language)
 *   - les items avec filtrage par recherche
 *   - le fallback sur la FAQ générique
 *
 * Usage :
 *   const { items, filteredItems, query, setQuery, isLoading } = useContextualFaq();
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { faqRegistry, ROUTE_PATTERN_MAP } from '@/data/faq/registry';
import { resolveFaqItems } from '@/data/faq/locales';
import type { FaqContext, FaqLocale, FaqRoute, FaqItem } from '@/types/faq';

// ─── Locale ───────────────────────────────────────────────────────────────────

const SUPPORTED_LOCALES: FaqLocale[] = ['fr', 'en'];
const DEFAULT_LOCALE: FaqLocale = 'fr';
const LOCALE_STORAGE_KEY = 'esamba_faq_locale';

function resolveLocale(): FaqLocale {
  // 1. Préférence stockée
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as FaqLocale | null;
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;

  // 2. Langue du navigateur
  const browserLang = navigator.language.split('-')[0] as FaqLocale;
  if (SUPPORTED_LOCALES.includes(browserLang)) return browserLang;

  return DEFAULT_LOCALE;
}

// ─── Route matching ───────────────────────────────────────────────────────────

function resolveRoute(pathname: string): FaqRoute {
  for (const { pattern, route } of ROUTE_PATTERN_MAP) {
    if (pattern.test(pathname)) return route as FaqRoute;
  }
  return 'generic';
}

// ─── Recherche ────────────────────────────────────────────────────────────────

function filterItems(items: FaqItem[], query: string): FaqItem[] {
  if (!query.trim()) return items;

  const needle = query.toLowerCase().trim();

  return items.filter((item) => {
    const inQuestion = item.question.toLowerCase().includes(needle);
    const inAnswer   = item.answer.toLowerCase().includes(needle);
    const inTags     = item.tags?.some((t) => t.toLowerCase().includes(needle)) ?? false;
    return inQuestion || inAnswer || inTags;
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useContextualFaq(): FaqContext {
  const { pathname } = useLocation();

  const [query,     setQuery]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locale,    setLocale]    = useState<FaqLocale>(DEFAULT_LOCALE);

  // Charger la locale côté client (évite le SSR mismatch)
  useEffect(() => {
    setLocale(resolveLocale());
  }, []);

  const route = useMemo(() => resolveRoute(pathname), [pathname]);

  // Réinitialiser la recherche à chaque changement de route
  useEffect(() => {
    setQuery('');
  }, [route]);

  // Utilise le résolveur avec fallback FR par item
  const items = useMemo((): FaqItem[] => resolveFaqItems(route, locale), [route, locale]);

  const filteredItems = useMemo(
    () => filterItems(items, query),
    [items, query],
  );

  const handleSetQuery = useCallback((q: string) => {
    setQuery(q);
  }, []);

  return {
    route,
    locale,
    items,
    filteredItems,
    isLoading,
    query,
    setQuery: handleSetQuery,
  };
}

// ─── Hook locale uniquement (pour le sélecteur de langue) ─────────────────────

export function useFaqLocale() {
  const [locale, setLocaleState] = useState<FaqLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(resolveLocale());
  }, []);

  const setLocale = useCallback((newLocale: FaqLocale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    setLocaleState(newLocale);
    // Propager à la page courante via event custom si besoin
    window.dispatchEvent(new CustomEvent('faq-locale-change', { detail: newLocale }));
  }, []);

  return { locale, setLocale, supported: SUPPORTED_LOCALES };
}
