import { useMemo } from 'react';
import { getCanonicalUrlFromPath } from '@/lib/seo';
import type { SeoUseCasePublic } from '@/types/seo-use-case';

interface UseCaseSchemaOrgProps {
  page: SeoUseCasePublic;
}

export function UseCaseSchemaOrg({ page }: UseCaseSchemaOrgProps) {
  const schema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.h1,
      description: page.meta_description,
      url: getCanonicalUrlFromPath(`/use-case/${page.slug}`),
      datePublished: page.published_at ?? undefined,
      dateModified: page.updated_at,
      author: {
        '@type': 'Organization',
        name: 'E-Samba',
      },
      publisher: {
        '@type': 'Organization',
        name: 'E-Samba',
      },
    }),
    [page]
  );

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml — JSON-LD statique issu du CMS
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
