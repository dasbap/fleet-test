import { useCallback, type ComponentProps } from "react";
import { Camera, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCamera } from "@/hooks/useCamera";
import type { CameraCaptureResult, CameraErrorCode } from "@/services/camera.service";

export type PhotoCaptureMode = "camera" | "gallery";

export interface PhotoCaptureButtonProps {
  /** Mode par défaut : appareil photo. */
  mode?: PhotoCaptureMode;
  /** Appelé après une capture réussie. */
  onPhoto: (result: CameraCaptureResult) => void;
  /** Erreurs et refus (ne pas toast pour `user_cancelled` si vous préférez le silence). */
  onError?: (message: string, code: CameraErrorCode) => void;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  children?: React.ReactNode;
  disabled?: boolean;
}

/**
 * Bouton déclenchant la caméra ou la galerie (Capacitor) avec état de chargement.
 */
export default function PhotoCaptureButton({
  mode = "camera",
  onPhoto,
  onError,
  className,
  variant = "secondary",
  size = "default",
  children,
  disabled,
}: PhotoCaptureButtonProps) {
  const { isCapturing, captureFromCamera, pickFromGallery } = useCamera();

  const handleClick = useCallback(async () => {
    const run = mode === "camera" ? captureFromCamera : pickFromGallery;
    const outcome = await run();
    if (outcome.ok) {
      onPhoto(outcome.result);
      return;
    }
    onError?.(outcome.message, outcome.code);
  }, [mode, captureFromCamera, pickFromGallery, onPhoto, onError]);

  const label =
    children ??
    (mode === "camera" ? (
      <>
        <Camera className="mr-2 h-4 w-4 shrink-0" aria-hidden />
        Prendre une photo
      </>
    ) : (
      <>
        <ImageIcon className="mr-2 h-4 w-4 shrink-0" aria-hidden />
        Choisir dans la galerie
      </>
    ));

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-0", className)}
      disabled={disabled || isCapturing}
      onClick={handleClick}
      aria-busy={isCapturing}
    >
      {isCapturing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
          Ouverture…
        </>
      ) : (
        label
      )}
    </Button>
  );
}
