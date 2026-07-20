/**
 * Dashboard analytics centre d'aide (organisateur).
 */
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHelpAnalytics } from '@/hooks/useHelpArticles';
import { ROUTE_PATHS } from '@/navigation/routePaths';
import { BarChart3, Search, Eye } from 'lucide-react';

interface AnalyticsArticle {
  slug: string;
  title: string;
  category: string;
  views: number;
}

interface AnalyticsSearch {
  query: string;
  count: number;
}

export default function HelpAnalyticsDashboard() {
  const { data, isLoading, error } = useHelpAnalytics(30);

  const topArticles = (data?.top_articles as AnalyticsArticle[] | undefined) ?? [];
  const noResults = (data?.searches_no_results as AnalyticsSearch[] | undefined) ?? [];
  const totalViews = (data?.total_views as number | undefined) ?? 0;
  const totalSearches = (data?.total_searches as number | undefined) ?? 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link to={ROUTE_PATHS.help} className="text-xs text-primary hover:underline">
          Centre d&apos;aide public
        </Link>
        <h1 className="font-heading text-2xl font-semibold mt-1 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" aria-hidden />
          Help Analytics
        </h1>
        <p className="text-sm text-muted-foreground">30 derniers jours</p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <p className="text-sm text-destructive">
          Analytics indisponibles. Vérifiez vos droits organisateur.
        </p>
      )}

      {!isLoading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" aria-hidden />
                  Vues articles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{totalViews}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4" aria-hidden />
                  Recherches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{totalSearches}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top 10 articles consultés</CardTitle>
            </CardHeader>
            <CardContent>
              {topArticles.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune donnée.</p>
              ) : (
                <ul className="space-y-2">
                  {topArticles.map((a) => (
                    <li key={a.slug} className="flex justify-between text-sm">
                      <span>{a.title}</span>
                      <span className="text-muted-foreground">{a.views} vues</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recherches sans résultat</CardTitle>
            </CardHeader>
            <CardContent>
              {noResults.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun gap identifié.</p>
              ) : (
                <ul className="space-y-2">
                  {noResults.map((s) => (
                    <li key={s.query} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">« {s.query} »</span>
                      <span>{s.count}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
