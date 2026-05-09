import { useCallback, useState } from "react";
import {
  cameraService,
  CameraServiceError,
  type CameraCaptureResult,
  type CameraErrorCode,
} from "@/services/camera.service";

export interface UseCameraState {
  isCapturing: boolean;
  lastPhoto: CameraCaptureResult | null;
  lastError: string | null;
  lastErrorCode: CameraErrorCode | null;
}

export type CaptureOutcome =
  | { ok: true; result: CameraCaptureResult }
  | { ok: false; code: CameraErrorCode; message: string };

const initialState: UseCameraState = {
  isCapturing: false,
  lastPhoto: null,
  lastError: null,
  lastErrorCode: null,
};

function toOutcome(e: unknown, fallbackMessage: string): { ok: false; code: CameraErrorCode; message: string } {
  if (e instanceof CameraServiceError) {
    return { ok: false, code: e.code, message: e.message };
  }
  const err = new CameraServiceError(fallbackMessage, "unknown", { cause: e });
  return { ok: false, code: err.code, message: err.message };
}

/**
 * Hook autour de {@link cameraService} : capture, erreurs utilisateur, état de chargement.
 */
export function useCamera() {
  const [state, setState] = useState<UseCameraState>(initialState);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, lastError: null, lastErrorCode: null }));
  }, []);

  const clearLastPhoto = useCallback(() => {
    setState((s) => ({ ...s, lastPhoto: null }));
  }, []);

  const captureFromCamera = useCallback(async (): Promise<CaptureOutcome> => {
    setState((s) => ({
      ...s,
      isCapturing: true,
      lastError: null,
      lastErrorCode: null,
    }));
    try {
      const result = await cameraService.takePictureFromCamera();
      setState((s) => ({
        ...s,
        isCapturing: false,
        lastPhoto: result,
        lastError: null,
        lastErrorCode: null,
      }));
      return { ok: true, result };
    } catch (e) {
      const out = toOutcome(e, "Erreur lors de l’utilisation de la caméra.");
      setState((s) => ({
        ...s,
        isCapturing: false,
        lastError: out.message,
        lastErrorCode: out.code,
      }));
      return out;
    }
  }, []);

  const pickFromGallery = useCallback(async (): Promise<CaptureOutcome> => {
    setState((s) => ({
      ...s,
      isCapturing: true,
      lastError: null,
      lastErrorCode: null,
    }));
    try {
      const result = await cameraService.pickFromPhotos();
      setState((s) => ({
        ...s,
        isCapturing: false,
        lastPhoto: result,
        lastError: null,
        lastErrorCode: null,
      }));
      return { ok: true, result };
    } catch (e) {
      const out = toOutcome(e, "Erreur lors de l’accès à la galerie.");
      setState((s) => ({
        ...s,
        isCapturing: false,
        lastError: out.message,
        lastErrorCode: out.code,
      }));
      return out;
    }
  }, []);

  const refreshPermissionHint = useCallback(async () => {
    try {
      return await cameraService.checkPermissions();
    } catch {
      return null;
    }
  }, []);

  return {
    ...state,
    captureFromCamera,
    pickFromGallery,
    clearError,
    clearLastPhoto,
    refreshPermissionHint,
  };
}
