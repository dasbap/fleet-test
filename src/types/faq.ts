/**
 * Types — Système FAQ contextuelle E-Samba
 */

// ─── Locales supportées ────────────────────────────────────────────────────────

export type FaqLocale = 'fr' | 'en' | 'ln'; // ln = Lingala (prévu)

// ─── Routes FAQ ───────────────────────────────────────────────────────────────
// Chaque valeur correspond à un segment de route ou à une section métier.

export type FaqRoute =
  | 'dashboard'
  | 'billing'
  | 'drivers'
  | 'fuel'
  | 'vehicles'
  | 'maintenance'
  | 'transit'
  | 'alerts'
  | 'generic'; // Fallback global

// ─── Contenu ──────────────────────────────────────────────────────────────────

export interface FaqItem {
  /** Identifiant unique — stable pour le SEO et les ancres */
  id: string;
  question: string;
  answer: string;
  /** Mots-clés pour la recherche */
  tags?: string[];
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export type FaqByLocale = Partial<Record<FaqLocale, FaqItem[]>>;
export type FaqRegistry = Partial<Record<FaqRoute, FaqByLocale>>;

// ─── Contexte retourné par le hook ────────────────────────────────────────────

export interface FaqContext {
  /** Route FAQ résolue (peut être 'generic' si aucune correspondance) */
  route: FaqRoute;
  locale: FaqLocale;
  /** Items correspondant à la route + locale actives */
  items: FaqItem[];
  /** Items filtrés par la recherche en cours */
  filteredItems: FaqItem[];
  /** Vrai pendant le chargement lazy du contenu */
  isLoading: boolean;
  /** Requête de recherche courante */
  query: string;
  setQuery: (q: string) => void;
}

// ─── Schema.org FAQ ───────────────────────────────────────────────────────────

export interface SchemaFaqPage {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: { '@type': 'Answer'; text: string };
  }>;
}
