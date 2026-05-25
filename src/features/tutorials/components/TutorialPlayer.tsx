import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, Maximize2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TutorialItem } from "@/repositories/tutorial.repository";
import {
  resolveVideoSource,
  type ParsedVideoSource,
} from "@/features/tutorials/lib/tutorialVideo";

export interface TutorialPlayerProps {
  tutorial: TutorialItem;
  videoSrc: string;
  playbackSource: "online" | "offline";
  initialPositionSec?: number;
  onPlay?: () => void;
  onProgress?: (positionSec: number, durationSec: number) => void;
  onCompleted?: () => void;
  className?: string;
}

export function TutorialPlayer({
  tutorial,
  videoSrc,
  playbackSource,
  initialPositionSec = 0,
  onPlay,
  onProgress,
  onCompleted,
  className,
}: TutorialPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const completedRef = useRef(false);

  const parsedSource: ParsedVideoSource = useMemo(
    () => resolveVideoSource(tutorial.provider, videoSrc, tutorial.externalUrl),
    [tutorial.provider, videoSrc, tutorial.externalUrl],
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    completedRef.current = false;
  }, [videoSrc, retryKey, parsedSource.kind]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || parsedSource.kind !== "html5" || initialPositionSec <= 0) return;
    const applySeek = () => {
      if (el.readyState >= 1 && el.duration > initialPositionSec) {
        el.currentTime = initialPositionSec;
      }
    };
    el.addEventListener("loadedmetadata", applySeek);
    applySeek();
    return () => el.removeEventListener("loadedmetadata", applySeek);
  }, [initialPositionSec, parsedSource.kind, retryKey, videoSrc]);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !el.duration || Number.isNaN(el.duration)) return;
    onProgress?.(el.currentTime, el.duration);
    if (!completedRef.current && el.currentTime / el.duration >= 0.8) {
      completedRef.current = true;
      onCompleted?.();
    }
  }, [onProgress, onCompleted]);

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
    setHasError(false);
    setIsLoading(true);
  };

  const handleFullscreen = async () => {
    const target = containerRef.current ?? videoRef.current;
    if (!target?.requestFullscreen) return;
    try {
      await target.requestFullscreen();
    } catch {
      // Plein écran non supporté sur certains WebView
    }
  };

  const openExternal = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!isOnline && playbackSource === "online" && parsedSource.kind === "html5") {
    return (
      <div
        className={cn(
          "flex aspect-video flex-col items-center justify-center gap-3 rounded-md bg-muted/40 p-4 text-center",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">
          Connexion indisponible. Téléchargez le tutoriel pour le regarder hors ligne.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={handleRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className={cn(
          "flex aspect-video flex-col items-center justify-center gap-3 rounded-md bg-muted/40 p-4 text-center",
          className,
        )}
      >
        <p className="text-sm text-destructive">
          Impossible de lire la vidéo. Vérifiez votre connexion ou réessayez.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
          {parsedSource.kind !== "html5" && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => openExternal(parsedSource.watchUrl)}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ouvrir dans le navigateur
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (parsedSource.kind === "youtube" || parsedSource.kind === "vimeo") {
    return (
      <div ref={containerRef} className={cn("relative aspect-video w-full", className)}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/60">
            <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
          </div>
        )}
        <iframe
          key={`${parsedSource.kind}-${retryKey}`}
          title={tutorial.title}
          src={parsedSource.embedUrl}
          className="h-full w-full rounded-md bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openExternal(parsedSource.watchUrl)}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Ouvrir dans le navigateur
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative aspect-video w-full", className)}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/70">
          <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
        </div>
      )}
      <video
        key={`html5-${retryKey}-${videoSrc}`}
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        poster={tutorial.thumbUrl}
        className="h-full w-full rounded-md bg-black object-contain"
        src={parsedSource.src}
        onLoadStart={() => setIsLoading(true)}
        onLoadedData={() => setIsLoading(false)}
        onCanPlay={() => setIsLoading(false)}
        onPlay={() => onPlay?.()}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          if (!completedRef.current) {
            completedRef.current = true;
            onCompleted?.();
          }
        }}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
      <div className="absolute bottom-2 right-2 z-20">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-8 w-8 opacity-90"
          aria-label="Plein écran"
          onClick={() => void handleFullscreen()}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
