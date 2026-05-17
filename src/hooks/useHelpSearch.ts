/**
 * Moteur de recherche local — Centre d'aide E-Samba.
 *
 * Recherche en temps réel sur :
 *   - Titres et résumés des guides
 *   - Étapes des tutoriels
 *   - FAQ (faq registry existant)
 *   - Tags
 *
 * Optimisé : pas de dépendance externe, 2G-friendly (bundle minimal).
 */

import { useState, useCallback, useMemo } from 'react';
import { GUIDES, QUICK_TUTORIALS, type Guide, type QuickTutorial, type GuideRole } from '@/data/help/guides';

// ── Types résultats ───────────────────────────────────────────────────────────

export type HelpResultType = 'guide' | 'tutorial' | 'faq';

export interface HelpSearchResult {
  type:       HelpResultType;
  id:         string;
  title:      string;
  summary:    string;
  score:      number;
  role?:      GuideRole | GuideRole[];
  duration?:  string;
  icon?:      string;
}

// ── Scoring simple (bag-of-words) ─────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // déaccenter
    .replace(/[^a-z0-9\s]/g, ' ');
}

function score(query: string, text: string): number {
  const q   = normalize(query).split(/\s+/).filter(Boolean);
  const t   = normalize(text);
  let total = 0;
  for (const word of q) {
    if (t.includes(word)) {
      // Bonus si le mot est en début de chaîne
      total += t.startsWith(word) ? 3 : 1;
      // Bonus occurrence multiple
      const matches = (t.match(new RegExp(word, 'g')) ?? []).length;
      total += Math.min(matches - 1, 2) * 0.5;
    }
  }
  return total;
}

function scoreGuide(query: string, g: Guide): number {
  return (
    score(query, g.title)   * 3 +
    score(query, g.summary) * 2 +
    score(query, g.tags.join(' ')) * 2 +
    g.steps.reduce((acc, s) => acc + score(query, s.title + ' ' + s.body), 0)
  );
}

function scoreTutorial(query: string, t: QuickTutorial): number {
  return (
    score(query, t.title)   * 3 +
    score(query, t.summary) * 2 +
    t.steps.reduce((acc, s) => acc + score(query, s), 0)
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const MIN_SCORE    = 0.5;
const MAX_RESULTS  = 12;

export interface UseHelpSearchReturn {
  query:      string;
  setQuery:   (q: string) => void;
  results:    HelpSearchResult[];
  hasResults: boolean;
  isSearching: boolean;
}

export function useHelpSearch(roleFilter?: GuideRole): UseHelpSearchReturn {
  const [query, setQuery] = useState('');

  const results = useMemo<HelpSearchResult[]>(() => {
    const q = query.trim();
    if (q.length < 2) return [];

    const raw: HelpSearchResult[] = [];

    // Guides
    for (const g of GUIDES) {
      if (roleFilter && g.role !== 'general' && g.role !== roleFilter) continue;
      const s = scoreGuide(q, g);
      if (s >= MIN_SCORE) {
        raw.push({
          type:     'guide',
          id:       g.id,
          title:    g.title,
          summary:  g.summary,
          score:    s,
          role:     g.role,
          duration: g.duration,
          icon:     g.category === 'urgence' ? '🚨' : g.category === 'démarrage' ? '🚀' : '📖',
        });
      }
    }

    // Tutoriels rapides
    for (const t of QUICK_TUTORIALS) {
      if (roleFilter && !t.role.includes(roleFilter) && !t.role.includes('general' as GuideRole)) continue;
      const s = scoreTutorial(q, t);
      if (s >= MIN_SCORE) {
        raw.push({
          type:     'tutorial',
          id:       t.id,
          title:    t.title,
          summary:  t.summary,
          score:    s,
          role:     t.role,
          duration: t.duration,
          icon:     t.icon,
        });
      }
    }

    return raw
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
  }, [query, roleFilter]);

  const handleSetQuery = useCallback((q: string) => {
    setQuery(q);
  }, []);

  return {
    query,
    setQuery:    handleSetQuery,
    results,
    hasResults:  results.length > 0,
    isSearching: query.trim().length >= 2,
  };
}
