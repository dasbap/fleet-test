import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import type { OfflineMediaRef } from "@esamba/offline-contracts";
import { isNativePlatform } from "@/lib/platform";

const PENDING_MEDIA_DIR = "pending-media";
const WEB_BLOB_PREFIX = "web-blob:";

interface WebBlobEntry {
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
}

const webBlobStore = new Map<string, WebBlobEntry>();

function createMediaId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Format data URL invalide.");
  }
  return { mimeType: match[1], base64: match[2] };
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

/**
 * Persiste un média compressé hors ligne.
 * Natif : Filesystem Capacitor. Web : store mémoire + localStorage index léger.
 */
export async function savePendingOfflineMedia(
  dataUrl: string,
  mimeType = "image/jpeg",
  sizeBytes?: number,
): Promise<OfflineMediaRef> {
  const id = createMediaId();
  const ext = extensionForMime(mimeType);
  const ref = `${PENDING_MEDIA_DIR}/${id}.${ext}`;

  if (isNativePlatform()) {
    const { base64 } = parseDataUrl(dataUrl);
    await Filesystem.writeFile({
      path: ref,
      data: base64,
      directory: Directory.Data,
      recursive: true,
    });
    const stat = await Filesystem.stat({ path: ref, directory: Directory.Data });
    return {
      ref,
      mimeType,
      sizeBytes: sizeBytes ?? stat.size ?? base64.length,
    };
  }

  const webKey = `${WEB_BLOB_PREFIX}${id}`;
  webBlobStore.set(webKey, {
    dataUrl,
    mimeType,
    sizeBytes: sizeBytes ?? Math.ceil((dataUrl.length * 3) / 4),
  });
  persistWebBlobIndex();
  return {
    ref: webKey,
    mimeType,
    sizeBytes: sizeBytes ?? webBlobStore.get(webKey)!.sizeBytes,
  };
}

/** Charge un média pending en data URL pour upload sync. */
export async function loadPendingOfflineMediaAsDataUrl(mediaRef: OfflineMediaRef): Promise<string> {
  if (mediaRef.ref.startsWith(WEB_BLOB_PREFIX)) {
    const entry = webBlobStore.get(mediaRef.ref) ?? loadWebBlobFromIndex(mediaRef.ref);
    if (!entry) {
      throw new Error("Média local introuvable.");
    }
    return entry.dataUrl;
  }

  if (isNativePlatform()) {
    const { data } = await Filesystem.readFile({
      path: mediaRef.ref,
      directory: Directory.Data,
    });
    const base64 = typeof data === "string" ? data : "";
    return `data:${mediaRef.mimeType};base64,${base64}`;
  }

  throw new Error("Média natif indisponible hors plateforme native.");
}

/** Supprime un média pending après sync réussie. */
export async function deletePendingOfflineMedia(mediaRef: OfflineMediaRef): Promise<void> {
  if (mediaRef.ref.startsWith(WEB_BLOB_PREFIX)) {
    webBlobStore.delete(mediaRef.ref);
    persistWebBlobIndex();
    return;
  }

  if (isNativePlatform()) {
    try {
      await Filesystem.deleteFile({
        path: mediaRef.ref,
        directory: Directory.Data,
      });
    } catch {
      // Fichier déjà supprimé
    }
  }
}

const WEB_BLOB_INDEX_KEY = "flotte-esamba:v1:pending-media-index";

function persistWebBlobIndex(): void {
  if (typeof localStorage === "undefined") return;
  const payload: Record<string, WebBlobEntry> = {};
  for (const [key, value] of webBlobStore.entries()) {
    payload[key] = value;
  }
  try {
    localStorage.setItem(WEB_BLOB_INDEX_KEY, JSON.stringify(payload));
  } catch {
    // Quota dépassé — le job garde la data URL legacy en fallback
  }
}

function loadWebBlobFromIndex(key: string): WebBlobEntry | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(WEB_BLOB_INDEX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, WebBlobEntry>;
    const entry = parsed[key] ?? null;
    if (entry) {
      webBlobStore.set(key, entry);
    }
    return entry;
  } catch {
    return null;
  }
}

/** Réhydrate le store web au démarrage. */
export function hydratePendingMediaStore(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(WEB_BLOB_INDEX_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, WebBlobEntry>;
    for (const [key, value] of Object.entries(parsed)) {
      webBlobStore.set(key, value);
    }
  } catch {
    // Ignorer corruption index
  }
}

/** Compat tests Capacitor : no-op si Filesystem indisponible. */
export function isOfflineMediaNative(): boolean {
  return Capacitor.isNativePlatform();
}
