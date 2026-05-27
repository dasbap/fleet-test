/**
 * Chargeur de locales FAQ — fusionne les registries par locale.
 *
 * Ajouter une langue :
 *   1. Créer faq.XX.ts avec FaqRegistry structuré par locale 'XX'
 *   2. Importer et ajouter dans LOCALE_REGISTRIES
 *   3. Ajouter 'XX' dans FaqLocale (types/faq.ts)
 */

import { faqFr } from './faq.fr';
import { faqEn } from './faq.en';
import { faqLn } from './faq.ln';
import type { FaqLocale, FaqRegistry, FaqItem, FaqRoute } from '@/types/faq';

// Registry fusionné — toutes les locales
const MERGED_REGISTRY: FaqRegistry = {};

for (const registry of [faqFr, faqEn, faqLn]) {
  for (const [route, byLocale] of Object.entries(registry)) {
    if (!MERGED_REGISTRY[route as FaqRoute]) {
      MERGED_REGISTRY[route as FaqRoute] = {};
    }
    Object.assign(MERGED_REGISTRY[route as FaqRoute]!, byLocale);
  }
}

export { MERGED_REGISTRY as faqRegistry };

/**
 * Résout les items FAQ pour une route + locale avec fallback FR.
 * Si la locale n'a pas de traduction pour un item, l'item FR correspondant est utilisé.
 */
export function resolveFaqItems(
  route: FaqRoute,
  locale: FaqLocale,
): FaqItem[] {
  const byLocale = MERGED_REGISTRY[route] ?? MERGED_REGISTRY['generic']!;

  // Items dans la locale demandée
  const localeItems = byLocale[locale] ?? [];

  // Items FR comme fallback
  const frItems     = byLocale['fr'] ?? MERGED_REGISTRY['generic']?.['fr'] ?? [];

  if (locale === 'fr' || localeItems.length === 0) return frItems;

  // Compléter avec le FR pour les items manquants (même id)
  const localeIds = new Set(localeItems.map((i) => i.id));
  const missing   = frItems.filter((i) => !localeIds.has(i.id));

  return [...localeItems, ...missing];
}

/** Liste des locales disponibles avec leur label natif */
export const FAQ_LOCALES: Array<{ code: FaqLocale; label: string; flag: string }> = [
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'ln', label: 'Lingála',   flag: '🇨🇩' },
];
