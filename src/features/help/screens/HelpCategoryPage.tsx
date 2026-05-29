/**
 * Liste des articles d'une catégorie d'aide.
 */
import { Link, useParams } from 'react-router-dom';
import { useHelpCategoryArticles } from '@/hooks/useHelpArticles';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { FaqSchemaOrg } from '@/components/faq/FaqSchemaOrg';
import { ROUTE_PATHS } from '@/navigation/routePaths';
import { HELP_PUBLIC_CATEGORIES } from '@/types/help';
import type { HelpArticleCategory } from '@/types/help';
import { SupportPanel } from '@/components/help/SupportPanel';

export default function HelpCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const cat = category as HelpArticleCategory;
  const { data: articles = [], isLoading } = useHelpCategoryArticles(cat, 'fr');
  const meta = HELP_PUBLIC_CATEGORIES.find((c) => c.slug === cat);

  const faqItems = articles.map((a) => ({
    id: a.slug,
    question: a.title,
    answer: a.content,
    tags: a.keywords,
  }));

  useSeoMeta({
    title: `${meta?.label ?? category} — Centre d'aide E-Samba`,
    canonical: `https://www.e-samba.com/help/${category}`,
    metas: [
      {
        name: 'description',
        content: `FAQ et guides ${meta?.label ?? category} pour E-Samba.`,
      },
    ],
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-6 space-y-6">
      <FaqSchemaOrg items={faqItems} />

      <header>
        <Link to={ROUTE_PATHS.help} className="text-xs text-primary hover:underline">
          ← Centre d&apos;aide
        </Link>
        <h1 className="font-heading text-xl font-semibold mt-2 flex items-center gap-2">
          {meta?.emoji && <span aria-hidden>{meta.emoji}</span>}
          {meta?.label ?? category}
        </h1>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : articles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun article dans cette catégorie.</p>
      ) : (
        <ul className="space-y-2">
          {articles.map((a) => (
            <li key={a.id}>
              <Link
                to={ROUTE_PATHS.helpArticle(a.category, a.slug)}
                className="block rounded-xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors"
              >
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.content}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <SupportPanel compact />
    </div>
  );
}
