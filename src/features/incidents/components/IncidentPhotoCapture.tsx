import { Camera, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCamera } from "@/hooks/useCamera";
import { cn } from "@/lib/utils";

interface IncidentPhotoCaptureProps {
  /** Data URL pour préremplissage / contrôle formulaire */
  value: string | null | undefined;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Capture photo terrain via {@link useCamera} (Capacitor) avec aperçu et suppression.
 */
export function IncidentPhotoCapture({
  value,
  onChange,
  disabled,
  className,
}: IncidentPhotoCaptureProps) {
  const { captureFromCamera, isCapturing, lastError, lastErrorCode, clearError, clearLastPhoto } =
    useCamera();

  const handleCapture = async () => {
    clearError();
    const out = await captureFromCamera();
    if (out.ok) {
      onChange(out.result.displayUrl);
    }
  };

  const handleRemove = () => {
    clearLastPhoto();
    onChange(null);
  };

  const preview = value ?? null;

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-medium text-foreground">Photo (optionnelle)</p>
      <p className="text-muted-foreground text-xs">
        Ajoutez une preuve visuelle depuis l’appareil photo. La photo est jointe au signalement
        en ligne ou sauvegardée avec le brouillon hors ligne.
      </p>

      {preview ? (
        <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
          <img
            src={preview}
            alt="Aperçu du signalement"
            className="max-h-56 w-full object-contain"
          />
          <div className="flex gap-2 border-t border-border bg-background/95 p-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={disabled || isCapturing}
              onClick={() => void handleCapture()}
            >
              <Camera className="h-4 w-4" aria-hidden />
              Reprendre
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-destructive"
              disabled={disabled}
              onClick={handleRemove}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Retirer
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="w-full gap-2"
          disabled={disabled || isCapturing}
          onClick={() => void handleCapture()}
        >
          {isCapturing ? (
            <>Ouverture…</>
          ) : (
            <>
              <Camera className="h-5 w-5" aria-hidden />
              Prendre une photo
            </>
          )}
        </Button>
      )}

      {lastError && lastErrorCode !== "user_cancelled" ? (
        <p className="text-destructive text-sm" role="alert">
          {lastError}
        </p>
      ) : null}

      {!preview ? (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Astuce : cadrez le véhicule ou la zone concernée.
        </p>
      ) : null}
    </div>
  );
}
