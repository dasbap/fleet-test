/**
 * Page résultats recherche aide (query param q).
 */
import { Link, useSearchParams } from 'react-router-dom';
import { HelpSearchBar } from '@/components/help/HelpSearchBar';
import { useHelpArticles } from '@/hooks/useHelpArticles';
import { useHelpSearchUnified } from '@/hooks/useHelpSearchUnified';
import { ROUTE_PATHS } from '@/navigation/routePaths';
import { useSeoMeta } from '@/hooks/useSeoMeta';

export default function HelpSearchPage() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const { data: articles = [] } = useHelpArticles('fr');
  const { query, setQuery, results } = useHelpSearchUnified(articles);

  useSeoMeta({
    title: query ? `Recherche : ${query} — E-Samba Aide` : 'Recherche — E-Samba Aide',
    canonical: 'https://www.e-samba.com/help/search',
  });

  const handleChange = (q: string) => {
    setQuery(q);
    if (q) setParams({ q });
    else setParams({});
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-6 space-y-4">
      <Link to={ROUTE_PATHS.help} className="text-xs text-primary hover:underline">
        ← Centre d&apos;aide
      </Link>
      <h1 className="font-heading text-lg font-semibold">Recherche</h1>
      <HelpSearchBar query={query || initialQ} onChange={handleChange} autoFocus />

      <ul className="space-y-2">
        {(query || initialQ).trim().length >= 2 &&
          results.map(({ article }) => (
            <li key={article.id}>
              <Link
                to={ROUTE_PATHS.helpArticle(article.category, article.slug)}
                className="block rounded-lg border border-border p-3 hover:bg-muted/30"
              >
                <p className="text-sm font-medium">{article.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{article.content}</p>
              </Link>
            </li>
          ))}
      </ul>
    </div>
  );
}
