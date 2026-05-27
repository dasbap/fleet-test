const CACHE_TTL_MS = 10 * 60 * 1000;
const videoAvailabilityCache = new Map<
  string,
  { available: boolean; checkedAt: number }
>();

/**
 * Vérifie si la vidéo MP4 est accessible sur Storage (HEAD puis GET partiel).
 */
export async function checkVideoAvailable(videoUrl: string): Promise<boolean> {
  if (!videoUrl?.trim()) return false;

  try {
    const head = await fetch(videoUrl, { method: "HEAD" });
    if (head.ok) return true;
  } catch {
    /* fallback GET */
  }

  try {
    const partial = await fetch(videoUrl, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
    });
    return partial.ok || partial.status === 206;
  } catch {
    return false;
  }
}

export async function getCachedVideoAvailability(
  tutorialId: string,
  videoUrl: string,
  forceRefresh = false,
): Promise<boolean> {
  const cached = videoAvailabilityCache.get(tutorialId);
  const now = Date.now();
  if (!forceRefresh && cached && now - cached.checkedAt < CACHE_TTL_MS) {
    return cached.available;
  }
  const available = await checkVideoAvailable(videoUrl);
  videoAvailabilityCache.set(tutorialId, { available, checkedAt: now });
  return available;
}

export function invalidateVideoAvailabilityCache(tutorialId: string): void {
  videoAvailabilityCache.delete(tutorialId);
}

export function clearVideoAvailabilityCache(): void {
  videoAvailabilityCache.clear();
}
