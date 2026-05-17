/**
 * Hook FAQ i18n — intégration react-i18next.
 *
 * Lit la langue active depuis i18next et résout automatiquement
 * les items FAQ avec fallback FR si traduction manquante.
 *
 * Usage sans i18next (standalone) :
 *   const { locale, setLocale, items } = useFaqTranslations('dashboard');
 *
 * Usage avec i18next (recommandé) :
 *   La locale est lue depuis i18next.language — aucune config supplémentaire.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveFaqItems, MERGED_REGISTRY as faqRegistry } from '@/data/faq/locales';
import { ROUTE_PATTERN_MAP } from '@/data/faq/registry';
import type { FaqItem, FaqLocale, FaqRoute } from '@/types/faq';

// ─── Intégration i18next optionnelle ─────────────────────────────────────────
// Si react-i18next n'est pas installé, on retombe sur localStorage/navigator.

function readI18nextLocale(): FaqLocale | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const i18n = (window as any).__i18next_instance ?? (window as any).i18n;
    if (i18n?.language) {
      const lang = i18n.language.split('-')[0] as FaqLocale;
      return ['fr', 'en', 'ln'].includes(lang) ? lang : null;
    }
  } catch {
    // i18next non disponible
  }
  return null;
}

const LOCALE_KEY = 'esamba_locale';
const SUPPORTED: FaqLocale[] = ['fr', 'en', 'ln'];

function getInitialLocale(): FaqLocale {
  const i18n      = readI18nextLocale();
  if (i18n) return i18n;

  const stored    = localStorage.getItem(LOCALE_KEY) as FaqLocale | null;
  if (stored && SUPPORTED.includes(stored)) return stored;

  const browser   = navigator.language.split('-')[0] as FaqLocale;
  return SUPPORTED.includes(browser) ? browser : 'fr';
}

function resolveRoute(pathname: string): FaqRoute {
  for (const { pattern, route } of ROUTE_PATTERN_MAP) {
    if (pattern.test(pathname)) return route as FaqRoute;
  }
  return 'generic';
}

// ─── Hook principal ───────────────────────────────────────────────────────────

interface UseFaqTranslationsResult {
  locale:    FaqLocale;
  setLocale: (l: FaqLocale) => void;
  route:     FaqRoute;
  items:     FaqItem[];
  /** Items filtrés par la recherche */
  filteredItems: FaqItem[];
  query:     string;
  setQuery:  (q: string) => void;
  /** Vrai si certains items utilisent le fallback FR */
  hasFallback: boolean;
}

export function useFaqTranslations(): UseFaqTranslationsResult {
  const { pathname } = useLocation();

  const [locale, setLocaleState] = useState<FaqLocale>('fr');
  const [query,  setQuery]       = useState('');

  // Hydratation côté client
  useEffect(() => {
    setLocaleState(getInitialLocale());
  }, []);

  // Écouter les changements de langue i18next et les events custom
  useEffect(() => {
    const onLocaleChange = (e: Event) => {
      const newLocale = (e as CustomEvent<FaqLocale>).detail;
      if (SUPPORTED.includes(newLocale)) setLocaleState(newLocale);
    };
    window.addEventListener('faq-locale-change', onLocaleChange);
    return () => window.removeEventListener('faq-locale-change', onLocaleChange);
  }, []);

  const setLocale = useCallback((l: FaqLocale) => {
    localStorage.setItem(LOCALE_KEY, l);
    setLocaleState(l);
    window.dispatchEvent(new CustomEvent('faq-locale-change', { detail: l }));
  }, []);

  const route = useMemo(() => resolveRoute(pathname), [pathname]);

  // Réinitialiser la recherche au changement de route
  useEffect(() => { setQuery(''); }, [route]);

  const items = useMemo(
    () => resolveFaqItems(route, locale),
    [route, locale],
  );

  // Détecter si des items utilisent le fallback FR
  const hasFallback = useMemo(() => {
    if (locale === 'fr') return false;
    const localeItems = faqRegistry[route]?.[locale] ?? [];
    return localeItems.length < items.length;
  }, [route, locale, items.length]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const needle = query.toLowerCase();
    return items.filter(
      (i) =>
        i.question.toLowerCase().includes(needle) ||
        i.answer.toLowerCase().includes(needle) ||
        i.tags?.some((t) => t.toLowerCase().includes(needle)),
    );
  }, [items, query]);

  return { locale, setLocale, route, items, filteredItems, query, setQuery, hasFallback };
}
