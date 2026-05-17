/**
 * Accordéon FAQ — affiche une liste de questions/réponses.
 * Surligne les termes recherchés dans les questions et réponses.
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { FaqItem } from '@/types/faq';

interface FaqAccordionProps {
  items:     FaqItem[];
  query?:    string;
  className?: string;
}

// Surligne les occurrences du terme dans le texte
function Highlight({ text, query }: { text: string; query?: string }) {
  if (!query?.trim()) return <>{text}</>;

  const needle = query.trim();
  const regex  = new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts  = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-100 text-amber-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function FaqAccordion({ items, query, className = '' }: FaqAccordionProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">
        Aucune question ne correspond à votre recherche.
      </p>
    );
  }

  return (
    <Accordion type="single" collapsible className={`w-full ${className}`}>
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger className="text-left text-sm font-medium text-gray-800 hover:text-gray-900 hover:no-underline">
            <Highlight text={item.question} query={query} />
          </AccordionTrigger>
          <AccordionContent className="text-sm text-gray-600 leading-relaxed">
            <Highlight text={item.answer} query={query} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
