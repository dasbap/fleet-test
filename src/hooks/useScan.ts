import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCamera } from "@/hooks/useCamera";
import { ScanRepository } from "@/repositories/scan.repository";
import { VehicleRepository } from "@/repositories/vehicle.repository";
import { ScanService } from "@/services/scan.service";
import { hapticsService } from "@/services/haptics.service";
import { useNetworkOnline } from "@/features/account/hooks/useNetworkOnline";

const vehicleRepository = new VehicleRepository();
const scanRepository = new ScanRepository(vehicleRepository);
const scanService = new ScanService(scanRepository);
const SCAN_COOLDOWN_MS = 2000;

export type ScanState = "scanning" | "loading" | "success" | "error";

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
  const isOnline = useNetworkOnline();
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [statusText, setStatusText] = useState("Pointez la caméra vers le QR code");
  const lastScanAtRef = useRef(0);
  const lastRawValueRef = useRef<string | null>(null);

  const resolveMutation = useMutation({
    mutationFn: (rawValue: string) => {
      if (!userFleetId) {
        throw new Error("Aucune flotte active.");
      }
      return scanService.resolveScan(rawValue, userFleetId);
    },
  });

  const resolveScan = useCallback(
    async (rawValue: string) => {
      const now = Date.now();
      if (now - lastScanAtRef.current < SCAN_COOLDOWN_MS) {
        throw new Error("Scan en cours, patientez une seconde puis réessayez.");
      }

      setScanState("loading");
      setStatusText("Chargement de la fiche...");
      lastScanAtRef.current = now;
      lastRawValueRef.current = rawValue;

      try {
        const result = await resolveMutation.mutateAsync(rawValue);
        setScanState("success");
        setStatusText(`${result.label} détecté.`);
        void hapticsService.notifySuccess();
        return result;
      } catch (error) {
        setScanState("error");
        void hapticsService.notifyError();
        if (!isOnline) {
          setStatusText("Hors ligne : véhicule absent du cache local.");
        } else {
          setStatusText(
            error instanceof Error ? error.message : "Échec du scan, veuillez réessayer.",
          );
        }
        throw error;
      }
    },
    [isOnline, resolveMutation],
  );

  const scanFromCamera = async () => {
    void hapticsService.impactSoft();
    const capture = await camera.captureFromCamera();
    if (!capture.ok) {
      setScanState("error");
      setStatusText(capture.message);
      throw new Error(capture.message);
    }
    const raw = await decodeWithBarcodeDetector(capture.result.displayUrl);
    if (!raw) {
      setScanState("error");
      setStatusText("Code non détecté. Utilisez la saisie manuelle.");
      throw new Error("Code non détecté. Utilisez la saisie manuelle.");
    }
    return resolveScan(raw);
  };

  const retryLastScan = useCallback(async () => {
    if (!lastRawValueRef.current) {
      throw new Error("Aucun scan précédent à relancer.");
    }
    return resolveScan(lastRawValueRef.current);
  }, [resolveScan]);

  const resetScanState = useCallback(() => {
    setScanState("scanning");
    setStatusText("Pointez la caméra vers le QR code");
  }, []);

  return {
    resolveScan,
    scanFromCamera,
    retryLastScan,
    resetScanState,
    scanState,
    statusText,
    isOnline,
    isLoading: resolveMutation.isPending || camera.isCapturing,
    error: resolveMutation.error instanceof Error ? resolveMutation.error.message : camera.lastError,
  };
}

