/** Taille max photo compressée acceptée en queue (500 Ko). */
export const MAX_COMPRESSED_PHOTO_BYTES = 500 * 1024;

/** Largeur max après redimensionnement. */
export const IMAGE_COMPRESS_MAX_WIDTH = 1280;

/** Qualité JPEG par défaut. */
export const IMAGE_COMPRESS_QUALITY = 0.7;

/**
 * Valide que le kilométrage de fin est >= kilométrage de départ.
 */
export function validateKmMonotone(kmStart: number, kmEnd: number): void {
  if (!Number.isFinite(kmStart) || !Number.isFinite(kmEnd)) {
    throw new Error("Kilométrage invalide.");
  }
  if (kmEnd < kmStart) {
    throw new Error("Le kilométrage de fin ne peut pas être inférieur au départ.");
  }
}

/**
 * Valide la taille d'un média offline avant enqueue.
 */
export function validateOfflineMediaSize(sizeBytes: number, maxBytes = MAX_COMPRESSED_PHOTO_BYTES): void {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Fichier média invalide.");
  }
  if (sizeBytes > maxBytes) {
    throw new Error(
      `Photo trop volumineuse (${Math.round(sizeBytes / 1024)} Ko). Limite : ${Math.round(maxBytes / 1024)} Ko.`,
    );
  }
}

/**
 * Fusion monotone du kilométrage véhicule (règle conflit KM).
 */
export function mergeVehicleKmMonotone(serverKm: number, localKm: number): number {
  return Math.max(serverKm, localKm);
}
