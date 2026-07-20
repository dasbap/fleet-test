import { useState } from "react";
import { Loader2, QrCode, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useScanActivationQr, type QrScanResult } from "@/hooks/useVehicleQr";
import { cn } from "@/lib/utils";

interface VehicleQrScannerProps {
  /** Pré-remplit le champ code si passé par URL param (?qr=ESQR-...). */
  initialCode?: string;
  onSuccess?: (result: QrScanResult) => void;
  className?: string;
}

/**
 * Interface minimale de scan QR d'activation véhicule.
 * Accepte la saisie manuelle du code (copier-coller) ou un input caméra futur.
 */
export function VehicleQrScanner({ initialCode = "", onSuccess, className }: VehicleQrScannerProps) {
  const [code, setCode] = useState(initialCode);
  const [lastResult, setLastResult] = useState<QrScanResult | null>(null);
  const scan = useScanActivationQr();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    const result = await scan.mutateAsync(trimmed).catch(() => null);
    if (result) {
      setLastResult(result);
      if (result.status === "success") {
        setCode("");
        onSuccess?.(result);
      }
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-base">Activation QR véhicule</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="qr-code">Code QR</Label>
          <div className="flex gap-2">
            <Input
              id="qr-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setLastResult(null);
              }}
              placeholder="ESQR-… ou ESQRL-…"
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-sm"
            />
            <Button type="submit" disabled={!code.trim() || scan.isPending}>
              {scan.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="h-4 w-4" />
              )}
              <span className="ml-1.5">Scanner</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Scannez le QR ou saisissez le code manuellement.
          </p>
        </div>
      </form>

      {lastResult && (
        <Alert
          className={cn(
            "rounded-xl border p-4",
            lastResult.status === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800",
          )}
        >
          <AlertDescription className="text-sm">
            <span className="font-semibold">
              {lastResult.status === "success" ? "✓ Activation réussie" : "✗ Activation refusée"}
            </span>
            <span className="ml-2">{lastResult.message}</span>
            {lastResult.status === "rejected" && lastResult.reason === "BLOCKED_DISCIPLINE" && (
              <p className="mt-1 text-xs">
                Le QR ne peut pas lever un blocage disciplinaire ou de maintenance critique.
                Contactez un gestionnaire.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
