import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCamera } from "@/hooks/useCamera";
import { ScanRepository } from "@/repositories/scan.repository";
import { VehicleRepository } from "@/repositories/vehicle.repository";
import { ScanService } from "@/services/scan.service";

const vehicleRepository = new VehicleRepository();
const scanRepository = new ScanRepository(vehicleRepository);
const scanService = new ScanService(scanRepository);

type BarcodeDetectorClass = {
  new (options?: { formats?: string[] }): {
    detect: (image: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
  };
};

async function decodeWithBarcodeDetector(imageUrl: string): Promise<string | null> {
  const detectorCtor = (window as Window & { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector;
  if (!detectorCtor) return null;

  const img = new Image();
  img.src = imageUrl;
  await img.decode();
  const detector = new detectorCtor({ formats: ["qr_code", "code_128", "ean_13", "ean_8"] });
  const results = await detector.detect(img);
  const raw = results.find((row) => row.rawValue)?.rawValue?.trim();
  return raw || null;
}

export function useScan() {
  const { userFleetId } = useAuth();
  const camera = useCamera();

  const resolveMutation = useMutation({
    mutationFn: (rawValue: string) => {
      if (!userFleetId) {
        throw new Error("Aucune flotte active.");
      }
      return scanService.resolveScan(rawValue, userFleetId);
    },
  });

  const scanFromCamera = async () => {
    const capture = await camera.captureFromCamera();
    if (!capture.ok) {
      throw new Error(capture.message);
    }
    const raw = await decodeWithBarcodeDetector(capture.result.displayUrl);
    if (!raw) {
      throw new Error("Code non détecté. Utilisez la saisie manuelle.");
    }
    return resolveMutation.mutateAsync(raw);
  };

  return {
    resolveScan: resolveMutation.mutateAsync,
    scanFromCamera,
    isLoading: resolveMutation.isPending || camera.isCapturing,
    error: resolveMutation.error instanceof Error ? resolveMutation.error.message : camera.lastError,
  };
}

