import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { BookOpen, Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useTutorials } from "@/hooks/useTutorials";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { tutorialOfflineService } from "@/services/tutorial-offline.service";

export default function TutorialsListPage() {
  const { data, isLoading, error } = useTutorials();
  const [metrics, setMetrics] = useState({
    downloadSuccessRate: 0,
    purgeCount: 0,
    checksumFailureRate: 0,
  });

  useEffect(() => {
    let cancelled = false;
    const loadMetrics = async () => {
      const next = await tutorialOfflineService.getOfflineMetrics();
      if (cancelled) return;
      setMetrics(next);
    };
    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) return <PageLoader />;

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-destructive">
          Impossible de charger les tutoriels pour le moment.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <BookOpen className="h-5 w-5 text-primary" />
          Tutoriels vidéo
        </h1>
        <p className="text-sm text-muted-foreground">
          Guides rapides pour démarrer les parcours métier.
        </p>
      </header>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 py-3">
            <p className="text-xs text-muted-foreground">Download success rate</p>
            <p className="text-lg font-semibold">
              {(metrics.downloadSuccessRate * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 py-3">
            <p className="text-xs text-muted-foreground">Purge count</p>
            <p className="text-lg font-semibold">{metrics.purgeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 py-3">
            <p className="text-xs text-muted-foreground">Checksum failure rate</p>
            <p className="text-lg font-semibold">
              {(metrics.checksumFailureRate * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </section>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(data || []).map((tutorial) => (
          <li key={tutorial.id}>
            <Link to={ROUTE_PATHS.dashboardTutorialDetail(tutorial.id)}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="space-y-3 py-3">
                  <img
                    src={tutorial.thumbUrl}
                    alt={tutorial.title}
                    className="h-36 w-full rounded-md object-cover"
                    loading="lazy"
                  />
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold">{tutorial.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      {tutorial.description}
                    </p>
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {tutorial.durationMin} min
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
