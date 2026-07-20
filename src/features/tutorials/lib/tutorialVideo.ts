import type { TutorialProvider } from "@/repositories/tutorial.repository";

export type ParsedVideoSource =
  | { kind: "html5"; src: string }
  | { kind: "youtube"; embedUrl: string; watchUrl: string }
  | { kind: "vimeo"; embedUrl: string; watchUrl: string };

const YOUTUBE_ID_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const VIMEO_ID_RE = /vimeo\.com\/(?:video\/)?(\d+)/;

export function detectProviderFromUrl(url: string): TutorialProvider {
  if (!url || url.trim() === "") return "storage";
  if (YOUTUBE_ID_RE.test(url)) return "youtube";
  if (VIMEO_ID_RE.test(url)) return "vimeo";
  return "storage";
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(YOUTUBE_ID_RE);
  return match?.[1] ?? null;
}

export function extractVimeoId(url: string): string | null {
  const match = url.match(VIMEO_ID_RE);
  return match?.[1] ?? null;
}

export function buildYouTubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

export function buildVimeoEmbedUrl(videoId: string): string {
  return `https://player.vimeo.com/video/${videoId}?title=0&byline=0`;
}

/**
 * Résout la source de lecture selon le fournisseur et les URLs fournies.
 */
export function resolveVideoSource(
  provider: TutorialProvider,
  videoUrl: string,
  externalUrl: string | null,
): ParsedVideoSource {
  const primary = (externalUrl?.trim() || videoUrl).trim();
  const effectiveProvider =
    provider === "storage" ? detectProviderFromUrl(primary) : provider;

  if (effectiveProvider === "youtube") {
    const id = extractYouTubeId(primary);
    if (!id) {
      return { kind: "html5", src: videoUrl };
    }
    const watchUrl = `https://www.youtube.com/watch?v=${id}`;
    return {
      kind: "youtube",
      embedUrl: buildYouTubeEmbedUrl(id),
      watchUrl,
    };
  }

  if (effectiveProvider === "vimeo") {
    const id = extractVimeoId(primary);
    if (!id) {
      return { kind: "html5", src: videoUrl };
    }
    const watchUrl = `https://vimeo.com/${id}`;
    return {
      kind: "vimeo",
      embedUrl: buildVimeoEmbedUrl(id),
      watchUrl,
    };
  }

  return { kind: "html5", src: videoUrl };
}

export function formatTutorialDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) return `${secs} s`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs} s`;
}
