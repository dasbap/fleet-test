/**
 * FAQ sticky desktop — panneau latéral collant visible à partir de lg.
 *
 * Intégration dans le layout dashboard :
 *   <div className="flex gap-6">
 *     <main className="flex-1 min-w-0">...</main>
 *     <FaqPanel />
 *   </div>
 *
 * Masqué sur mobile (géré par FaqDrawer).
 */

import { HelpCircle, ChevronRight } from 'lucide-react';
import { useContextualFaq } from '@/hooks/useContextualFaq';
import { FaqAccordion } from './FaqAccordion';
import { FaqSearch } from './FaqSearch';
import { FaqSchemaOrg } from './FaqSchemaOrg';
import { FAQ_ROUTE_LABELS } from './faqLabels';
import { SUPPORT } from '@/config/navigation';

interface FaqPanelProps {
  /** Largeur du panneau (Tailwind class) */
  width?: string;
}

export function FaqPanel({ width = 'w-72' }: FaqPanelProps) {
  const { items, filteredItems, query, setQuery, route } = useContextualFaq();

  const label = FAQ_ROUTE_LABELS[route] ?? 'Aide';

  return (
    <>
      <FaqSchemaOrg items={items} />

      <aside
        className={`hidden lg:flex flex-col ${width} shrink-0`}
        aria-label="FAQ contextuelle"
      >
        <div className="sticky top-6 flex flex-col gap-3 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-sm p-4">
          {/* En-tête */}
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-blue-500 shrink-0" aria-hidden />
            <h2 className="text-sm font-semibold text-gray-800">
              Aide — {label}
            </h2>
          </div>

          {/* Recherche */}
          {items.length > 3 && (
            <FaqSearch query={query} onChange={setQuery} />
          )}

          {/* FAQ */}
          <FaqAccordion items={filteredItems} query={query} />

          {/* Lien vers le support */}
          <a
            href={SUPPORT.mailtoHref}
            className="mt-1 flex items-center justify-between text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            <span>Contacter le support</span>
            <ChevronRight className="h-3 w-3" aria-hidden />
          </a>
        </div>
      </aside>
    </>
  );
}
