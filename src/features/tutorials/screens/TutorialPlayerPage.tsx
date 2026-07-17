import { Link, useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Loader2, Star, Trash2, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/dashboard/PageLoader";
import { TutorialPlayer } from "@/features/tutorials/components/TutorialPlayer";
import { TutorialErrorBoundary } from "@/features/tutorials/components/TutorialErrorBoundary";
import {
  useTutorial,
  useTutorialVideoAvailability,
  tutorialProgressService,
} from "@/hooks/useTutorials";
import { TutorialVideoPending } from "@/features/tutorials/components/TutorialVideoPending";
import { invalidateVideoAvailabilityCache } from "@/features/tutorials/lib/tutorialMediaAvailability";
import { useAuth } from "@/hooks/useAuth";
import {
  useRecordTutorialView,
  useSaveTutorialProgress,
} from "@/hooks/useTutorialProgress";
import { useToggleTutorialFavorite } from "@/hooks/useTutorialFavorites";
import { TUTORIAL_COMPLETION_RATIO } from "@/domain/constants/tutorialCategories";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import { tutorialOfflineService } from "@/services/tutorial-offline.service";
import { toast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";

export default function TutorialPlayerPage() {
  const { tutorialId = "" } = useParams();
  const { user } = useAuth();
  const { data, isLoading, error } = useTutorial(tutorialId);
  const {
    data: videoAvailable,
    isLoading: isCheckingVideo,
    refetch: refetchVideoAvailability,
    isFetching: isRefetchingVideo,
  } = useTutorialVideoAvailability(
    tutorialId,
    data?.videoUrl,
    Boolean(data?.id && data.provider === "storage"),
  );
  const [forcePending, setForcePending] = useState(false);
  const [initialPositionSec, setInitialPositionSec] = useState(0);
  const saveProgress = useSaveTutorialProgress();
  const recordView = useRecordTutorialView();
  const toggleFavorite = useToggleTutorialFavorite();

  const [isOfflineSupported, setIsOfflineSupported] = useState(false);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(false);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const lastProgressRef = useRef(0);
  const viewRecordedRef = useRef(false);

  const syncOfflineState = useCallback(async () => {
    const supported = await tutorialOfflineService.isSupported();
    setIsOfflineSupported(supported);
    if (!supported || !tutorialId) {
      setIsOfflineAvailable(false);
      setLocalVideoUrl(null);
      setIsFavorite(false);
      return;
    }
    const favorite = await tutorialOfflineService.isFavorite(tutorialId);
    setIsFavorite(favorite);
    const downloaded = await tutorialOfflineService.isDownloaded(tutorialId);
    if (downloaded) {
      const checksumOk = await tutorialOfflineService.validateChecksum(tutorialId);
      if (!checksumOk) {
        await tutorialOfflineService.removeTutorial(tutorialId);
        setIsOfflineAvailable(false);
        setLocalVideoUrl(null);
        toast({
          title: "Copie hors ligne invalide",
          description: "La vidéo locale a été supprimée, la version en ligne est utilisée.",
          variant: "destructive",
        });
        return;
      }
      const localUrl = await tutorialOfflineService.resolveLocalVideoUrl(tutorialId);
      setLocalVideoUrl(localUrl);
      setIsOfflineAvailable(true);
      return;
    }
    setIsOfflineAvailable(false);
    setLocalVideoUrl(null);
  }, [tutorialId]);

  useEffect(() => {
    void syncOfflineState();
  }, [syncOfflineState]);

  useEffect(() => {
    if (!user?.id || !data?.id) return;
    let cancelled = false;
    void tutorialProgressService
      .getProgressMap(user.id, [data.id])
      .then((map) => {
        if (cancelled) return;
        const row = map[data.id];
        if (row && !row.completed_at) {
          setInitialPositionSec(row.position_sec);
        }
      })
      .catch(() => {
        /* progression optionnelle */
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, data?.id]);

  const videoSrc = useMemo(
    () => localVideoUrl ?? data?.videoUrl ?? "",
    [data?.videoUrl, localVideoUrl],
  );

  const playbackSource = localVideoUrl ? "offline" : "online";

  const canPlayVideo =
    Boolean(localVideoUrl) ||
    (videoAvailable === true && !forcePending) ||
    (data?.provider !== "storage");

  const showVideoPending =
    !localVideoUrl &&
    data?.provider === "storage" &&
    (forcePending || videoAvailable === false) &&
    !isCheckingVideo;

  const canDownloadOffline =
    isOfflineSupported && canPlayVideo && !isOfflineAvailable;

  const handleRetryVideoCheck = () => {
    invalidateVideoAvailabilityCache(tutorialId);
    setForcePending(false);
    void refetchVideoAvailability();
  };

  const handlePlay = () => {
    if (!data) return;
    analytics.tutorialOfflinePlayed(data.id, playbackSource);
    if (!viewRecordedRef.current) {
      viewRecordedRef.current = true;
      recordView.mutate({
        tutorialId: data.id,
        source: playbackSource,
        watchedSec: 0,
      });
    }
  };

  const handleProgress = (positionSec: number, durationSec: number) => {
    if (!data || durationSec <= 0) return;
    const rounded = Math.floor(positionSec);
    if (Math.abs(rounded - lastProgressRef.current) < 5) return;
    lastProgressRef.current = rounded;
    const completed = positionSec / durationSec >= TUTORIAL_COMPLETION_RATIO;
    saveProgress.mutate({
      tutorialId: data.id,
      positionSec: rounded,
      completed,
    });
  };

  const handleCompleted = () => {
    if (!data) return;
    saveProgress.mutate({
      tutorialId: data.id,
      positionSec: data.durationSec,
      completed: true,
    });
  };

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
      const localUrl = await tutorialOfflineService.resolveLocalVideoUrl(data.id);
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

  const handleToggleFavorite = () => {
    const next = !isFavorite;
    toggleFavorite.mutate(
      { tutorialId: data.id, value: next },
      { onSuccess: () => setIsFavorite(next) },
    );
  };

  return (
    <TutorialErrorBoundary>
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
                  onClick={handleToggleFavorite}
                  disabled={isSyncingOffline || toggleFavorite.isPending}
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
                ) : canDownloadOffline ? (
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
                ) : null}
                {isOfflineAvailable ? (
                  <p className="w-full text-xs text-muted-foreground">
                    Lecture locale active.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Le mode hors ligne des tutoriels est disponible sur mobile natif.
              </p>
            )}
            {isCheckingVideo && !localVideoUrl ? (
              <div className="flex aspect-video items-center justify-center rounded-md bg-muted/40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : showVideoPending ? (
              <TutorialVideoPending
                title={data.title}
                onRetry={handleRetryVideoCheck}
                isRetrying={isRefetchingVideo}
              />
            ) : canPlayVideo ? (
              <TutorialPlayer
                tutorial={data}
                videoSrc={videoSrc}
                playbackSource={playbackSource}
                initialPositionSec={initialPositionSec}
                onPlay={handlePlay}
                onProgress={handleProgress}
                onCompleted={handleCompleted}
                onVideoUnavailable={() => setForcePending(true)}
              />
            ) : (
              <TutorialVideoPending
                title={data.title}
                onRetry={handleRetryVideoCheck}
                isRetrying={isRefetchingVideo}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </TutorialErrorBoundary>
  );
}
