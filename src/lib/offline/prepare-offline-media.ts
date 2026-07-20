import type { OfflineMediaRef } from "@esamba/offline-contracts";
import { validateOfflineMediaSize } from "@esamba/domain-validation";
import { compressImageForOffline } from "@/services/image-compression.service";
import { savePendingOfflineMedia } from "@/services/offline-media-storage.service";

/**
 * Compresse et persiste un média pour enqueue offline (évite base64 en queue).
 */
export async function prepareOfflineMediaFromDataUrl(dataUrl: string): Promise<OfflineMediaRef> {
  const compressed = await compressImageForOffline(dataUrl);
  const finalDataUrl = compressed?.dataUrl ?? dataUrl;
  const mimeType = compressed?.mimeType ?? "image/jpeg";
  const sizeBytes = compressed?.sizeBytes;
  validateOfflineMediaSize(sizeBytes ?? Math.ceil((finalDataUrl.length * 3) / 4));
  return savePendingOfflineMedia(finalDataUrl, mimeType, sizeBytes);
}

/** Résout evidence pour sync : mediaRef prioritaire sur data URL legacy. */
export async function resolveEvidenceDataUrl(payload: {
  evidenceDataUrl?: string | null;
  evidenceMediaRef?: OfflineMediaRef | null;
}): Promise<string | null> {
  if (payload.evidenceMediaRef) {
    const { loadPendingOfflineMediaAsDataUrl } = await import(
      "@/services/offline-media-storage.service"
    );
    return loadPendingOfflineMediaAsDataUrl(payload.evidenceMediaRef);
  }
  return payload.evidenceDataUrl?.trim() || null;
}

/** Résout preuve clôture pour sync. */
export async function resolveProofValue(payload: {
  proofValue: string;
  proofMediaRef?: OfflineMediaRef | null;
}): Promise<string> {
  if (payload.proofMediaRef) {
    const { loadPendingOfflineMediaAsDataUrl } = await import(
      "@/services/offline-media-storage.service"
    );
    return loadPendingOfflineMediaAsDataUrl(payload.proofMediaRef);
  }
  return payload.proofValue;
}

/** Résout photos DVIR pour sync. */
export async function resolveDvirPhotoDataUrls(payload: {
  photoDataUrls?: string[];
  photoMediaRefs?: OfflineMediaRef[];
}): Promise<string[]> {
  const { loadPendingOfflineMediaAsDataUrl } = await import(
    "@/services/offline-media-storage.service"
  );
  if (payload.photoMediaRefs?.length) {
    const urls: string[] = [];
    for (const ref of payload.photoMediaRefs) {
      urls.push(await loadPendingOfflineMediaAsDataUrl(ref));
    }
    return urls;
  }
  return payload.photoDataUrls ?? [];
}
