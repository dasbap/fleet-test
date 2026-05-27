/**
 * FAQ drawer mobile — bouton flottant + Sheet latérale.
 * Visible uniquement sur mobile (lg:hidden).
 *
 * Intégration : placer <FaqDrawer /> n'importe où dans le layout,
 * le bouton flottant se positionne en bas à droite.
 */

import { HelpCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useContextualFaq } from '@/hooks/useContextualFaq';
import { FaqAccordion } from './FaqAccordion';
import { FaqSearch } from './FaqSearch';
import { FAQ_ROUTE_LABELS } from './faqLabels';

export function FaqDrawer() {
  const { items, filteredItems, query, setQuery, route } = useContextualFaq();

  const label = FAQ_ROUTE_LABELS[route] ?? 'Aide';

  return (
    <div className="lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
            aria-label="Ouvrir la FAQ"
          >
            <HelpCircle className="h-5 w-5" aria-hidden />
            <span className="text-sm font-medium">Aide</span>
          </button>
        </SheetTrigger>

        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col gap-4 p-5">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-4 w-4 text-blue-500" aria-hidden />
              Aide — {label}
            </SheetTitle>
          </SheetHeader>

          {items.length > 3 && (
            <FaqSearch
              query={query}
              onChange={setQuery}
              placeholder="Rechercher dans la FAQ…"
            />
          )}

          <div className="overflow-y-auto flex-1 -mx-1 px-1">
            <FaqAccordion items={filteredItems} query={query} />
          </div>

          <a
            href="mailto:support@e-samba.com"
            className="text-center text-sm text-blue-600 hover:underline py-2"
          >
            Contacter le support →
          </a>
        </SheetContent>
      </Sheet>
    </div>
  );
}
