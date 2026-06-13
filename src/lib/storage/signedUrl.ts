import { supabase } from '@/integrations/supabase/client';

const DEFAULT_TTL_SECONDS = 3600;
const CACHE_BUFFER_MS = 60_000;

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, CacheEntry>();

/** Extrait le chemin objet depuis une URL publique/signée ou un chemin brut. */
export function extractStorageObjectPath(bucket: string, stored: string): string {
  const trimmed = stored.trim();
  if (!trimmed) return '';

  const publicMarker = `/object/public/${bucket}/`;
  const publicIdx = trimmed.indexOf(publicMarker);
  if (publicIdx >= 0) {
    return decodeURIComponent(trimmed.slice(publicIdx + publicMarker.length).split('?')[0] ?? '');
  }

  const signMarker = `/object/sign/${bucket}/`;
  const signIdx = trimmed.indexOf(signMarker);
  if (signIdx >= 0) {
    return decodeURIComponent(trimmed.slice(signIdx + signMarker.length).split('?')[0] ?? '');
  }

  return trimmed.replace(/^\/+/, '');
}

/** URL signée avec cache mémoire court (évite les appels répétés). */
export async function getSignedStorageUrl(
  bucket: string,
  pathOrUrl: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string | null> {
  const objectPath = extractStorageObjectPath(bucket, pathOrUrl);
  if (!objectPath) return null;

  const cacheKey = `${bucket}:${objectPath}`;
  const now = Date.now();
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > now + CACHE_BUFFER_MS) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, ttlSeconds);

  if (error || !data?.signedUrl) {
    console.error(`Erreur URL signée (${bucket}/${objectPath}):`, error?.message);
    return null;
  }

  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: now + ttlSeconds * 1000,
  });

  return data.signedUrl;
}

/** Invalide le cache pour un objet (après upload/suppression). */
export function invalidateSignedStorageUrl(bucket: string, pathOrUrl: string): void {
  const objectPath = extractStorageObjectPath(bucket, pathOrUrl);
  if (objectPath) {
    signedUrlCache.delete(`${bucket}:${objectPath}`);
  }
}
