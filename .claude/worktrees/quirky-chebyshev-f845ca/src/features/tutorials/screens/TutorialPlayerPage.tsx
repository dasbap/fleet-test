import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Loader2, Star, Trash2, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { useTutorial } from "@/hooks/useTutorials";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { tutorialOfflineService } from "@/services/tutorial-offline.service";
import { toast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";

export default function TutorialPlayerPage() {
  const { tutorialId = "" } = useParams();
  const { data, isLoading, error } = useTutorial(tutorialId);
  const [isOfflineSupported, setIsOfflineSupported] = useState(false);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(false);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const syncOfflineState = async () => {
      const supported = await tutorialOfflineService.isSupported();
      if (cancelled) return;
      setIsOfflineSupported(supported);
      if (!supported || !tutorialId) {
        setIsOfflineAvailable(false);
        setLocalVideoUrl(null);
        setIsFavorite(false);
        return;
      }
      const favorite = await tutorialOfflineService.isFavorite(tutorialId);
      if (cancelled) return;
      setIsFavorite(favorite);
      const [downloaded, localUrl] = await Promise.all([
        tutorialOfflineService.isDownloaded(tutorialId),
        tutorialOfflineService.getLocalVideoUrl(tutorialId),
      ]);
      if (downloaded) {
        const checksumOk = await tutorialOfflineService.validateChecksum(tutorialId);
        if (!checksumOk) {
          await tutorialOfflineService.removeTutorial(tutorialId);
          if (cancelled) return;
          setIsOfflineAvailable(false);
          setLocalVideoUrl(null);
          toast({
            title: "Copie hors ligne invalide",
            description: "La vidéo locale a été supprimée, la version en ligne est utilisée.",
            variant: "destructive",
          });
          return;
        }
      }
      if (cancelled) return;
      setIsOfflineAvailable(downloaded);
      setLocalVideoUrl(localUrl);
    };
    void syncOfflineState();
    return () => {
      cancelled = true;
    };
  }, [tutorialId]);

  const videoSrc = useMemo(() => localVideoUrl ?? data?.videoUrl ?? "", [data?.videoUrl, localVideoUrl]);

  if (isLoading) return <PageLoader />;

  if (error || !data) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8 text-sm">
          <p className="text-destructive">Tutoriel introuvable ou indisponible.</p>
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTE_PATHS.dashboardTutorials}>Retour à la liste</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleDownloadOffline = async () => {
    setIsSyncingOffline(true);
    try {
      await tutorialOfflineService.downloadTutorial(data);
      const localUrl = await tutorialOfflineService.getLocalVideoUrl(data.id);
      setLocalVideoUrl(localUrl);
      setIsOfflineAvailable(true);
      toast({
        title: "Tutoriel téléchargé",
        description: "La vidéo est disponible hors ligne sur cet appareil.",
      });
    } catch (downloadError) {
      toast({
        title: "Téléchargement impossible",
        description:
          downloadError instanceof Error
            ? downloadError.message
            : "Impossible de télécharger le tutoriel.",
        variant: "destructive",
      });
    } finally {
      setIsSyncingOffline(false);
    }
  };

  const handleRemoveOffline = async () => {
    setIsSyncingOffline(true);
    try {
      await tutorialOfflineService.removeTutorial(data.id);
      setIsOfflineAvailable(false);
      setLocalVideoUrl(null);
      toast({
        title: "Tutoriel supprimé",
        description: "La copie hors ligne a été supprimée.",
      });
    } catch {
      toast({
        title: "Suppression impossible",
        description: "Impossible de supprimer la copie hors ligne.",
        variant: "destructive",
      });
    } finally {
      setIsSyncingOffline(false);
    }
  };

  const handleToggleFavorite = async () => {
    const next = !isFavorite;
    await tutorialOfflineService.setFavorite(data.id, next);
    setIsFavorite(next);
    toast({
      title: next ? "Ajouté aux favoris" : "Retiré des favoris",
      description: next
        ? "Ce tutoriel est prioritaire pour la conservation hors ligne."
        : "Ce tutoriel n'est plus prioritaire pour la conservation hors ligne.",
    });
  };

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to={ROUTE_PATHS.dashboardTutorials}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour
        </Link>
      </Button>
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Video className="h-5 w-5 text-primary" />
          {data.title}
        </h1>
        <p className="text-sm text-muted-foreground">{data.description}</p>
      </header>
      <Card>
        <CardContent className="space-y-3 py-4">
          {isOfflineSupported ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={isFavorite ? "default" : "outline"}
                onClick={() => void handleToggleFavorite()}
                disabled={isSyncingOffline}
              >
                <Star className="mr-2 h-4 w-4" />
                {isFavorite ? "Favori prioritaire" : "Marquer favori"}
              </Button>
              {isOfflineAvailable ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleRemoveOffline()}
                  disabled={isSyncingOffline}
                >
                  {isSyncingOffline ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Supprimer la copie hors ligne
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleDownloadOffline()}
                  disabled={isSyncingOffline}
                >
                  {isSyncingOffline ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Télécharger hors ligne
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                {isOfflineAvailable
                  ? "Lecture locale active."
                  : "Version en ligne uniquement pour le moment."}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Le mode hors ligne des tutoriels est disponible sur mobile natif.
            </p>
          )}
          <video
            controls
            preload="metadata"
            poster={data.thumbUrl}
            className="w-full rounded-md bg-black"
            src={videoSrc}
            onPlay={() => analytics.tutorialOfflinePlayed(data.id, localVideoUrl ? "offline" : "online")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
