import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import type { PermissionStatus, Photo } from "@capacitor/camera";
import { isUserCancellationMessage } from "@/lib/cameraCancellation";

/** Résultat normalisé pour l’UI (aperçu, envoi futur). */
export interface CameraCaptureResult {
  /** URL utilisable dans `<img src={...} />` (Capacitor webPath ou dataUrl). */
  displayUrl: string;
  format: string;
  /** Chemin natif si présent (Filesystem / upload). */
  nativePath?: string;
  base64?: string;
  dataUrl?: string;
}

export type CameraErrorCode =
  | "permission_denied"
  | "user_cancelled"
  | "unavailable"
  | "unknown";

export class CameraServiceError extends Error {
  constructor(
    message: string,
    public readonly code: CameraErrorCode,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "CameraServiceError";
  }
}

export { isUserCancellationMessage } from "@/lib/cameraCancellation";

function mapUnknownError(err: unknown): CameraServiceError {
  if (err instanceof CameraServiceError) return err;
  const message =
    err instanceof Error ? err.message : "Impossible d’utiliser l’appareil photo.";
  if (isUserCancellationMessage(message)) {
    return new CameraServiceError("Capture annulée.", "user_cancelled", { cause: err });
  }
  return new CameraServiceError(message, "unknown", { cause: err });
}

/**
 * Service caméra : permissions + capture via @capacitor/camera.
 * Aucun accès Supabase — uniquement plugin natif / fallback web.
 */
export class CameraService {
  /**
   * État des permissions caméra / photothèque (utile pour l’UI).
   */
  async checkPermissions(): Promise<PermissionStatus> {
    try {
      return await Camera.checkPermissions();
    } catch (e) {
      throw mapUnknownError(e);
    }
  }

  /**
   * Demande l’accès caméra (et photothèque si besoin pour la source « Prompt »).
   */
  async requestCameraPermission(): Promise<PermissionStatus> {
    try {
      return await Camera.requestPermissions({ permissions: ["camera"] });
    } catch (e) {
      throw mapUnknownError(e);
    }
  }

  /**
   * S’assure que la caméra est utilisable ; lève {@link CameraServiceError} si refus définitif.
   */
  async ensureCameraPermission(): Promise<void> {
    let status = await this.checkPermissions();
    if (status.camera === "denied") {
      throw new CameraServiceError(
        "L’accès à la caméra est refusé. Activez-la dans les réglages de l’application.",
        "permission_denied"
      );
    }
    if (status.camera === "prompt" || status.camera === "limited") {
      status = await this.requestCameraPermission();
    }
    if (status.camera === "denied") {
      throw new CameraServiceError(
        "L’accès à la caméra est refusé. Vous pouvez l’autoriser dans les réglages.",
        "permission_denied"
      );
    }
  }

  private photoToResult(photo: Photo): CameraCaptureResult {
    const displayUrl =
      photo.webPath ?? photo.dataUrl ?? (photo.base64String ? `data:image/jpeg;base64,${photo.base64String}` : "");
    if (!displayUrl) {
      throw new CameraServiceError("Photo reçue sans aperçu utilisable.", "unavailable");
    }
    return {
      displayUrl,
      format: photo.format,
      nativePath: photo.path,
      base64: photo.base64String,
      dataUrl: photo.dataUrl,
    };
  }

  /**
   * Ouvre l’appareil photo et retourne une URI / data pour aperçu.
   */
  async takePictureFromCamera(options?: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  }): Promise<CameraCaptureResult> {
    await this.ensureCameraPermission();
    try {
      const photo = await Camera.getPhoto({
        quality: options?.quality ?? 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: options?.maxWidth,
        height: options?.maxHeight,
      });
      return this.photoToResult(photo);
    } catch (e) {
      if (e instanceof CameraServiceError) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      if (isUserCancellationMessage(msg)) {
        throw new CameraServiceError("Capture annulée.", "user_cancelled", { cause: e });
      }
      throw mapUnknownError(e);
    }
  }

  /**
   * Choisir une image existante (sinistre / pièce déjà dans la galerie).
   */
  async pickFromPhotos(options?: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  }): Promise<CameraCaptureResult> {
    let status = await this.checkPermissions();
    if (status.photos === "denied") {
      throw new CameraServiceError(
        "L’accès à la photothèque est refusé. Activez-le dans les réglages de l’application.",
        "permission_denied"
      );
    }
    if (status.photos === "prompt" || status.photos === "limited") {
      status = await Camera.requestPermissions({ permissions: ["photos"] });
    }
    if (status.photos === "denied") {
      throw new CameraServiceError(
        "L’accès à la photothèque est refusé.",
        "permission_denied"
      );
    }
    try {
      const photo = await Camera.getPhoto({
        quality: options?.quality ?? 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        width: options?.maxWidth,
        height: options?.maxHeight,
      });
      return this.photoToResult(photo);
    } catch (e) {
      if (e instanceof CameraServiceError) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      if (isUserCancellationMessage(msg)) {
        throw new CameraServiceError("Sélection annulée.", "user_cancelled", { cause: e });
      }
      throw mapUnknownError(e);
    }
  }
}

export const cameraService = new CameraService();
