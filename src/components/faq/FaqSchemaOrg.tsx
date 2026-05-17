/**
 * Injection du JSON-LD schema.org FAQPage pour le SEO.
 * À placer dans le <head> via un portail ou directement dans le composant parent.
 */

import { useMemo } from 'react';
import type { FaqItem, SchemaFaqPage } from '@/types/faq';

interface FaqSchemaOrgProps {
  items: FaqItem[];
}

export function FaqSchemaOrg({ items }: FaqSchemaOrgProps) {
  const schema = useMemo((): SchemaFaqPage => ({
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name:    item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text:    item.answer,
      },
    })),
  }), [items]);

  if (items.length === 0) return null;

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml — données statiques internes
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
