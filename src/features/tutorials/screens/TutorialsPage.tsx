import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, HelpCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TutorialErrorBoundary } from "@/features/tutorials/components/TutorialErrorBoundary";
import { TutorialCard } from "@/features/tutorials/components/TutorialCard";
import { TutorialsListSkeleton } from "@/features/tutorials/components/TutorialsListSkeleton";
import { useTutorials } from "@/hooks/useTutorials";
import { useFlushTutorialSync } from "@/hooks/useTutorialProgress";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { tutorialOfflineService } from "@/services/tutorial-offline.service";
import { TUTORIAL_CATEGORY_SEEDS } from "@/data/tutorials/catalog.seed";
import { cn } from "@/lib/utils";
import { isNativePlatform } from "@/lib/platform";

export default function TutorialsPage() {
  const [categorySlug, setCategorySlug] = useState<string | undefined>();
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [metrics, setMetrics] = useState({
    downloadSuccessRate: 0,
    purgeCount: 0,
    checksumFailureRate: 0,
  });

  const { data, isLoading, error, refetch, isFetching } = useTutorials({
    categorySlug,
  });
  const flushSync = useFlushTutorialSync();

  const loadOfflineState = useCallback(async () => {
    const [ids, nextMetrics] = await Promise.all([
      tutorialOfflineService.getDownloadedTutorialIds(),
      tutorialOfflineService.getOfflineMetrics(),
    ]);
    setDownloadedIds(new Set(ids));
    setMetrics(nextMetrics);
  }, []);

  useEffect(() => {
    void loadOfflineState();
  }, [loadOfflineState]);

  useEffect(() => {
    const onOnline = () => {
      void flushSync.mutateAsync();
      void refetch();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushSync, refetch]);

  const completedCount = useMemo(
    () => (data ?? []).filter((t) => t.completed).length,
    [data],
  );

  const handleRefresh = () => {
    void refetch();
    void loadOfflineState();
  };

  if (isLoading && !data?.length) {
    return (
      <div className="space-y-4">
        <TutorialsPageHeader completedCount={0} total={0} onRefresh={handleRefresh} isRefreshing={isFetching} />
        <TutorialsListSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-sm">
          <p className="text-destructive">Impossible de charger les tutoriels pour le moment.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tutorials = data ?? [];

  return (
    <TutorialErrorBoundary onReset={() => void refetch()}>
      <div className="space-y-4">
        <TutorialsPageHeader
          completedCount={completedCount}
          total={tutorials.length}
          onRefresh={handleRefresh}
          isRefreshing={isFetching}
        />

        {isNativePlatform() && (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard
              label="Taux de réussite téléchargement"
              value={`${(metrics.downloadSuccessRate * 100).toFixed(1)} %`}
            />
            <MetricCard label="Purges quota" value={String(metrics.purgeCount)} />
            <MetricCard
              label="Échecs contrôle d'intégrité"
              value={`${(metrics.checksumFailureRate * 100).toFixed(1)} %`}
            />
          </section>
        )}

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer par catégorie">
          <FilterChip
            active={!categorySlug}
            onClick={() => setCategorySlug(undefined)}
            label="Tous"
          />
          {TUTORIAL_CATEGORY_SEEDS.map((cat) => (
            <FilterChip
              key={cat.slug}
              active={categorySlug === cat.slug}
              onClick={() => setCategorySlug(cat.slug)}
              label={cat.labelFr}
            />
          ))}
        </div>

        {tutorials.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucun tutoriel dans cette catégorie.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {tutorials.map((tutorial) => (
              <TutorialCard
                key={tutorial.id}
                tutorial={tutorial}
                isOfflineAvailable={downloadedIds.has(tutorial.id)}
              />
            ))}
          </ul>
        )}

        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Besoin d&apos;étapes texte courtes ? Consultez le centre d&apos;aide.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/help">Centre d&apos;aide</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </TutorialErrorBoundary>
  );
}

function TutorialsPageHeader({
  completedCount,
  total,
  onRefresh,
  isRefreshing,
}: {
  completedCount: number;
  total: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <BookOpen className="h-5 w-5 text-primary" />
          Tutoriels vidéo
        </h1>
        <p className="text-sm text-muted-foreground">
          Guides rapides pour les parcours métier E-Samba.
          {total > 0 && (
            <span className="ml-1 font-medium text-foreground">
              {completedCount}/{total} terminés
            </span>
          )}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isRefreshing}
        onClick={onRefresh}
      >
        <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
        Actualiser
      </Button>
    </header>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 py-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
