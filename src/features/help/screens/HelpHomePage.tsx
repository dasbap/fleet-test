/**
 * Accueil du centre d'aide — recherche, catégories, démarrage rapide.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, Wrench, Users, BookOpen, Search, Zap, Video, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTE_PATHS } from '@/navigation/routePaths';
import { HelpSearchBar } from '@/components/help/HelpSearchBar';
import { QuickTutorialCard } from '@/components/help/QuickTutorialCard';
import { RoleGuideSection } from '@/components/help/RoleGuideSection';
import { SupportPanel } from '@/components/help/SupportPanel';
import { HelpFAQ } from '@/components/shared/HelpCenter';
import { useHelpArticles } from '@/hooks/useHelpArticles';
import { useHelpSearchUnified } from '@/hooks/useHelpSearchUnified';
import { useHelpSearchHistory } from '@/hooks/useHelpSearchHistory';
import { useSeoMeta } from '@/hooks/useSeoMeta';
import { FaqSchemaOrg } from '@/components/faq/FaqSchemaOrg';
import { HELP_PUBLIC_CATEGORIES } from '@/types/help';
import { QUICK_TUTORIALS, type GuideRole } from '@/data/help/guides';

type ActiveTab = 'tutoriels' | GuideRole | 'organisateur';

const ROLE_TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: 'tutoriels', label: 'Tutoriels', icon: <Zap className="h-4 w-4" /> },
  { id: 'chauffeur', label: 'Chauffeur', icon: <Truck className="h-4 w-4" /> },
  { id: 'gestionnaire', label: 'Gestionnaire', icon: <Users className="h-4 w-4" /> },
  { id: 'organisateur', label: 'Organisateur', icon: <Building2 className="h-4 w-4" /> },
  { id: 'mécanicien', label: 'Mécanicien', icon: <Wrench className="h-4 w-4" /> },
];

export default function HelpHomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tutoriels');
  const { data: articles = [] } = useHelpArticles('fr');
  const { query, setQuery, results, isSearching } = useHelpSearchUnified(articles);
  const { history } = useHelpSearchHistory();
  const topTutorials = QUICK_TUTORIALS.slice(0, 6);

  const faqItems = articles.slice(0, 8).map((a) => ({
    id: a.slug,
    question: a.title,
    answer: a.content,
    tags: a.keywords,
  }));

  useSeoMeta({
    title: 'Centre d\'aide E-Samba — Guides et FAQ',
    canonical: 'https://www.e-samba.com/help',
    metas: [
      {
        name: 'description',
        content: 'Guides, tutoriels et FAQ pour gérer votre flotte E-Samba. Mobile-first, disponible hors ligne.',
      },
    ],
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <FaqSchemaOrg items={faqItems} />

      <header className="space-y-1">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          Centre d&apos;aide E-Samba
        </h1>
        <p className="text-sm text-muted-foreground">
          Guides, tutoriels et réponses — disponibles hors ligne.
        </p>
      </header>

      <HelpSearchBar query={query} onChange={setQuery} autoFocus={false} />

      {!isSearching && history.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {history.slice(0, 5).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setQuery(h)}
              className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {h}
            </button>
          ))}
        </div>
      )}

      {isSearching && (
        <section aria-label="Résultats de recherche">
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucun résultat pour « {query} »</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map(({ article }) => (
                <Link
                  key={article.id}
                  to={ROUTE_PATHS.helpArticle(article.category, article.slug)}
                  className="block rounded-xl border border-border bg-card p-3.5 hover:bg-muted/30 transition-colors"
                >
                  <p className="text-sm font-medium">{article.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{article.content}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {!isSearching && (
        <>
          <Link
            to={ROUTE_PATHS.helpQuickstart}
            className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-colors"
          >
            <Zap className="h-6 w-6 text-primary shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-semibold">Démarrage rapide</p>
              <p className="text-xs text-muted-foreground">Organisation → clôture en moins de 8 minutes</p>
            </div>
          </Link>

          <section aria-label="Catégories">
            <h2 className="text-sm font-semibold mb-3">Parcourir par thème</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {HELP_PUBLIC_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  to={ROUTE_PATHS.helpCategory(cat.slug)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center hover:bg-muted/30 transition-colors"
                >
                  <span aria-hidden>{cat.emoji}</span>
                  <span className="text-xs font-medium">{cat.label}</span>
                </Link>
              ))}
            </div>
          </section>

          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none" role="tablist">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'tutoriels' && (
            <section className="space-y-4">
              <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <Video className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-sm font-medium">Tutoriels vidéo</p>
                    <p className="text-xs text-muted-foreground">Guides vidéo terrain et dashboard</p>
                  </div>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link to={ROUTE_PATHS.dashboardTutorials}>Voir les vidéos</Link>
                </Button>
              </div>
              <div className="space-y-2">
                {topTutorials.map((t) => (
                  <QuickTutorialCard key={t.id} tutorial={t} />
                ))}
              </div>
            </section>
          )}

          {activeTab === 'chauffeur' && <RoleGuideSection role="chauffeur" />}
          {activeTab === 'gestionnaire' && <RoleGuideSection role="gestionnaire" />}
          {activeTab === 'mécanicien' && <RoleGuideSection role="mécanicien" />}
          {activeTab === 'organisateur' && (
            <section className="space-y-2">
              {articles
                .filter((a) => a.category === 'organizer' || a.category === 'billing')
                .slice(0, 8)
                .map((a) => (
                  <Link
                    key={a.id}
                    to={ROUTE_PATHS.helpArticle(a.category, a.slug)}
                    className="block rounded-lg border border-border p-3 hover:bg-muted/30"
                  >
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{a.content}</p>
                  </Link>
                ))}
            </section>
          )}

          <section>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
              Questions fréquentes
            </h2>
            <HelpFAQ />
          </section>

          <SupportPanel />
        </>
      )}
    </div>
  );
}
