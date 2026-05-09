import { Capacitor } from "@capacitor/core";
import {
  Directory,
  Filesystem,
  type ReaddirResult,
} from "@capacitor/filesystem";
import { analytics } from "@/lib/analytics";
import { isNativePlatform } from "@/lib/platform";
import type { TutorialItem } from "@/repositories/tutorial.repository";

interface TutorialOfflineMeta {
  tutorialId: string;
  fileName: string;
  downloadedAtIso: string;
  sizeBytes: number;
  checksumSha256: string;
}

interface TutorialOfflineMetrics {
  downloadAttempts: number;
  downloadSuccesses: number;
  purgeCount: number;
  checksumFailures: number;
}

const META_STORAGE_KEY = "tutorials-offline-meta-v1";
const FAVORITES_STORAGE_KEY = "tutorials-offline-favorites-v1";
const METRICS_STORAGE_KEY = "tutorials-offline-metrics-v1";
const TUTORIALS_DIR = "tutorials";
const DEFAULT_MAX_OFFLINE_STORAGE_BYTES = 250 * 1024 * 1024;

function resolveQuotaBytes(): number {
  const raw = Number(import.meta.env.VITE_TUTORIAL_OFFLINE_QUOTA_MB);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_MAX_OFFLINE_STORAGE_BYTES;
  }
  return Math.floor(raw * 1024 * 1024);
}

function getMetaMap(): Record<string, TutorialOfflineMeta> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, TutorialOfflineMeta>;
  } catch {
    return {};
  }
}

function setMetaMap(value: Record<string, TutorialOfflineMeta>): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(META_STORAGE_KEY, JSON.stringify(value));
}

function getFavoriteSet(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function setFavoriteSet(values: Set<string>): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(values)));
}

function getMetrics(): TutorialOfflineMetrics {
  if (typeof localStorage === "undefined") {
    return { downloadAttempts: 0, downloadSuccesses: 0, purgeCount: 0, checksumFailures: 0 };
  }
  try {
    const raw = localStorage.getItem(METRICS_STORAGE_KEY);
    if (!raw) {
      return { downloadAttempts: 0, downloadSuccesses: 0, purgeCount: 0, checksumFailures: 0 };
    }
    const parsed = JSON.parse(raw) as Partial<TutorialOfflineMetrics>;
    return {
      downloadAttempts: parsed.downloadAttempts ?? 0,
      downloadSuccesses: parsed.downloadSuccesses ?? 0,
      purgeCount: parsed.purgeCount ?? 0,
      checksumFailures: parsed.checksumFailures ?? 0,
    };
  } catch {
    return { downloadAttempts: 0, downloadSuccesses: 0, purgeCount: 0, checksumFailures: 0 };
  }
}

function setMetrics(value: TutorialOfflineMetrics): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(value));
}

function extractExtension(videoUrl: string): string {
  const clean = videoUrl.split("?")[0];
  const ext = clean.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 5 ? ext : "mp4";
}

function toNativeFileUrl(uri: string): string {
  return Capacitor.convertFileSrc(uri);
}

async function ensureTutorialDirectory(): Promise<void> {
  try {
    await Filesystem.mkdir({
      path: TUTORIALS_DIR,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    // Le dossier existe déjà.
  }
}

async function listTutorialFiles(): Promise<ReaddirResult["files"]> {
  await ensureTutorialDirectory();
  const result = await Filesystem.readdir({
    path: TUTORIALS_DIR,
    directory: Directory.Data,
  });
  return result.files;
}

async function fetchAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Téléchargement du tutoriel impossible.");
  }
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function estimateBytesFromBase64(base64Data: string): number {
  const padding = (base64Data.match(/=+$/)?.[0].length ?? 0);
  return Math.max(0, Math.floor((base64Data.length * 3) / 4) - padding);
}

async function hashBase64(base64Data: string): Promise<string> {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const digestBytes = new Uint8Array(digest);
  return Array.from(digestBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getTotalStoredBytes(map: Record<string, TutorialOfflineMeta>): number {
  return Object.values(map).reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
}

export class TutorialOfflineService {
  private async purgeForQuota(
    nextSizeBytes: number,
    protectedTutorialId: string | null,
  ): Promise<void> {
    const map = getMetaMap();
    const maxOfflineStorageBytes = resolveQuotaBytes();
    let total = getTotalStoredBytes(map);
    if (total + nextSizeBytes <= maxOfflineStorageBytes) return;

    const favorites = getFavoriteSet();
    const victims = Object.values(map)
      .filter((item) => item.tutorialId !== protectedTutorialId)
      .sort((a, b) => {
        const aFav = favorites.has(a.tutorialId) ? 1 : 0;
        const bFav = favorites.has(b.tutorialId) ? 1 : 0;
        if (aFav !== bFav) return aFav - bFav;
        return a.downloadedAtIso.localeCompare(b.downloadedAtIso);
      });

    for (const victim of victims) {
      await this.removeTutorial(victim.tutorialId, false);
      total -= victim.sizeBytes;
      analytics.tutorialOfflinePurged(victim.tutorialId, "quota");
      const metrics = getMetrics();
      setMetrics({
        ...metrics,
        purgeCount: metrics.purgeCount + 1,
      });
      if (total + nextSizeBytes <= maxOfflineStorageBytes) {
        return;
      }
    }
  }

  async isSupported(): Promise<boolean> {
    return isNativePlatform();
  }

  async getLocalVideoUrl(tutorialId: string): Promise<string | null> {
    if (!isNativePlatform()) return null;
    const meta = getMetaMap()[tutorialId];
    if (!meta) return null;
    try {
      const fileUri = await Filesystem.getUri({
        path: `${TUTORIALS_DIR}/${meta.fileName}`,
        directory: Directory.Data,
      });
      analytics.tutorialOfflinePlayed(tutorialId, "offline");
      return toNativeFileUrl(fileUri.uri);
    } catch {
      return null;
    }
  }

  async isDownloaded(tutorialId: string): Promise<boolean> {
    return (await this.getLocalVideoUrl(tutorialId)) !== null;
  }

  async downloadTutorial(tutorial: TutorialItem): Promise<void> {
    if (!isNativePlatform()) {
      throw new Error("Le téléchargement hors ligne est disponible uniquement sur mobile.");
    }
    const metricsStart = getMetrics();
    setMetrics({
      ...metricsStart,
      downloadAttempts: metricsStart.downloadAttempts + 1,
    });
    await ensureTutorialDirectory();
    const extension = extractExtension(tutorial.videoUrl);
    const fileName = `${tutorial.id}.${extension}`;
    const start = Date.now();
    const base64Data = await fetchAsBase64(tutorial.videoUrl);
    const sizeBytes = estimateBytesFromBase64(base64Data);
    await this.purgeForQuota(sizeBytes, tutorial.id);
    const checksumSha256 = await hashBase64(base64Data);
    await Filesystem.writeFile({
      path: `${TUTORIALS_DIR}/${fileName}`,
      data: base64Data,
      directory: Directory.Data,
      recursive: true,
    });
    const nextMeta = getMetaMap();
    nextMeta[tutorial.id] = {
      tutorialId: tutorial.id,
      fileName,
      downloadedAtIso: new Date().toISOString(),
      sizeBytes,
      checksumSha256,
    };
    setMetaMap(nextMeta);
    analytics.tutorialOfflineDownloaded(tutorial.id, sizeBytes, Date.now() - start);
    const metricsSuccess = getMetrics();
    setMetrics({
      ...metricsSuccess,
      downloadSuccesses: metricsSuccess.downloadSuccesses + 1,
    });
  }

  async removeTutorial(tutorialId: string, trackRemoval = true): Promise<void> {
    if (!isNativePlatform()) return;
    const map = getMetaMap();
    const meta = map[tutorialId];
    if (!meta) return;
    try {
      await Filesystem.deleteFile({
        path: `${TUTORIALS_DIR}/${meta.fileName}`,
        directory: Directory.Data,
      });
    } catch {
      // Ignore les suppressions déjà effectives.
    }
    delete map[tutorialId];
    setMetaMap(map);
    if (trackRemoval) {
      analytics.tutorialOfflineRemoved(tutorialId);
    }
  }

  async getDownloadedTutorialIds(): Promise<string[]> {
    if (!isNativePlatform()) return [];
    const files = await listTutorialFiles();
    const map = getMetaMap();
    const available = new Set(files.map((file) => file.name));
    return Object.values(map)
      .filter((meta) => available.has(meta.fileName))
      .map((meta) => meta.tutorialId);
  }

  async validateChecksum(tutorialId: string): Promise<boolean> {
    if (!isNativePlatform()) return false;
    const meta = getMetaMap()[tutorialId];
    if (!meta) return false;
    try {
      const content = await Filesystem.readFile({
        path: `${TUTORIALS_DIR}/${meta.fileName}`,
        directory: Directory.Data,
      });
      const base64Data = typeof content.data === "string" ? content.data : "";
      if (!base64Data) return false;
      const checksum = await hashBase64(base64Data);
      const ok = checksum === meta.checksumSha256;
      if (!ok) {
        analytics.tutorialOfflineChecksumFailed(tutorialId);
        const metrics = getMetrics();
        setMetrics({
          ...metrics,
          checksumFailures: metrics.checksumFailures + 1,
        });
      }
      return ok;
    } catch {
      return false;
    }
  }

  async setFavorite(tutorialId: string, value: boolean): Promise<void> {
    const favorites = getFavoriteSet();
    if (value) {
      favorites.add(tutorialId);
    } else {
      favorites.delete(tutorialId);
    }
    setFavoriteSet(favorites);
  }

  async isFavorite(tutorialId: string): Promise<boolean> {
    return getFavoriteSet().has(tutorialId);
  }

  async getFavorites(): Promise<string[]> {
    return Array.from(getFavoriteSet());
  }

  async getOfflineMetrics(): Promise<{
    downloadSuccessRate: number;
    purgeCount: number;
    checksumFailureRate: number;
  }> {
    const metrics = getMetrics();
    const downloadSuccessRate =
      metrics.downloadAttempts > 0
        ? metrics.downloadSuccesses / metrics.downloadAttempts
        : 0;
    const checksumFailureRate =
      metrics.downloadSuccesses > 0
        ? metrics.checksumFailures / metrics.downloadSuccesses
        : 0;
    return {
      downloadSuccessRate,
      purgeCount: metrics.purgeCount,
      checksumFailureRate,
    };
  }
}

export const tutorialOfflineService = new TutorialOfflineService();
