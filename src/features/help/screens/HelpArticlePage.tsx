/**
 * Détail d'un article d'aide.
 */
import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useHelpArticle, useTrackHelpView } from '@/hooks/useHelpArticles';
import { HelpMarkdownContent } from '@/features/help/components/HelpMarkdownContent';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { FaqSchemaOrg } from '@/components/faq/FaqSchemaOrg';
import { ROUTE_PATHS } from '@/navigation/routePaths';
import { SupportPanel } from '@/components/help/SupportPanel';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

export default function HelpArticlePage() {
  const { category, slug } = useParams<{ category: string; slug: string }>();
  const { data: article, isLoading } = useHelpArticle(slug, 'fr');
  const trackView = useTrackHelpView();
  const { userFleetId } = useAuth();

  useEffect(() => {
    if (article?.id && !article.id.startsWith('fallback-')) {
      trackView.mutate({ articleId: article.id, source: 'page', fleetId: userFleetId });
    }
  }, [article?.id, userFleetId, trackView]);

  useSeoMeta({
    title: article ? `${article.title} — E-Samba Aide` : 'Article — E-Samba Aide',
    canonical: `https://www.e-samba.com/help/${category}/${slug}`,
    metas: article
      ? [{ name: 'description', content: article.content.slice(0, 160) }]
      : [],
  });

  if (isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Chargement…</p>;
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <p className="text-sm text-muted-foreground">Article introuvable.</p>
        <Link to={ROUTE_PATHS.help} className="text-sm text-primary hover:underline mt-2 inline-block">
          Retour au centre d&apos;aide
        </Link>
      </div>
    );
  }

  const faqItem = [{ id: article.slug, question: article.title, answer: article.content, tags: article.keywords }];

  return (
    <article className="mx-auto max-w-xl px-4 py-6 space-y-6">
      <FaqSchemaOrg items={faqItem} />

      <header>
        <Link
          to={ROUTE_PATHS.helpCategory(article.category)}
          className="text-xs text-primary hover:underline"
        >
          ← {article.category}
        </Link>
        <h1 className="font-heading text-xl font-semibold mt-2">{article.title}</h1>
        {article.plan_min && (
          <Badge variant="outline" className="mt-2 text-xs">
            Plan {article.plan_min} recommandé
          </Badge>
        )}
      </header>

      <HelpMarkdownContent content={article.content} />

      {article.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {article.keywords.map((kw) => (
            <Badge key={kw} variant="secondary" className="text-[10px]">
              {kw}
            </Badge>
          ))}
        </div>
      )}

      <SupportPanel />
    </article>
  );
}
