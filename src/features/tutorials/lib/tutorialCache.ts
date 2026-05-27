import type { TutorialItem } from "@/repositories/tutorial.repository";

const CACHE_KEY = "esamba-tutorials-list-v2";
const CACHE_VERSION = 2;

interface TutorialListCachePayload {
  version: number;
  savedAtIso: string;
  items: TutorialItem[];
}

export function readTutorialListCache(): TutorialItem[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TutorialListCachePayload;
    if (parsed.version !== CACHE_VERSION || !Array.isArray(parsed.items)) {
      return null;
    }
    return parsed.items;
  } catch {
    return null;
  }
}

export function writeTutorialListCache(items: TutorialItem[]): void {
  if (typeof localStorage === "undefined") return;
  const payload: TutorialListCachePayload = {
    version: CACHE_VERSION,
    savedAtIso: new Date().toISOString(),
    items,
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

export function clearTutorialListCache(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}
