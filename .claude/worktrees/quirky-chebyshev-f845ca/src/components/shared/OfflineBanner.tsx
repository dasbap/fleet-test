import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useOfflineSyncStatus } from "@/hooks/useOfflineSyncStatus";
import { syncQueue } from "@/services/syncQueue.service";

type NetworkType = "wifi" | "cellular" | "none" | "unknown";
type EffectiveType = "2g" | "3g" | "4g" | null;

function useNetworkQuality(): { type: NetworkType; effectiveType: EffectiveType } {
  const resolve = useCallback(() => {
    if (typeof navigator === "undefined") {
      return { type: "unknown" as const, effectiveType: null };
    }
    if (!navigator.onLine) {
      return { type: "none" as const, effectiveType: null };
    }
    const connection = (navigator as Navigator & {
      connection?: { type?: string; effectiveType?: string };
    }).connection;
    const type = connection?.type === "wifi" ? "wifi" : "cellular";
    const effectiveType =
      connection?.effectiveType === "2g" ||
      connection?.effectiveType === "3g" ||
      connection?.effectiveType === "4g"
        ? connection.effectiveType
        : null;
    return { type, effectiveType };
  }, []);
  const [network, setNetwork] = useState(resolve);

  useEffect(() => {
    if (typeof window === "undefined") return () => undefined;
    const onChange = () => setNetwork(resolve());
    const connection = (navigator as Navigator & {
      connection?: {
        addEventListener?: (evt: string, cb: () => void) => void;
        removeEventListener?: (evt: string, cb: () => void) => void;
      };
    }).connection;
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    connection?.addEventListener?.("change", onChange);
    return () => {
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
      connection?.removeEventListener?.("change", onChange);
    };
  }, [resolve]);

  return network;
}

function useOfflineBannerState() {
  const { displayStatus, isOnline, pendingIncidentDraftsCount } = useOfflineSyncStatus();
  const isSyncing = displayStatus === "syncing";
  const queueCount = pendingIncidentDraftsCount;
  const shouldShowBanner = !isOnline || isSyncing;
  return { isOnline, isSyncing, queueCount, shouldShowBanner };
}

export function OfflineBanner() {
  const { toast } = useToast();
  const { isOnline, isSyncing, queueCount, shouldShowBanner } = useOfflineBannerState();

  const handleRetry = useCallback(async () => {
    const { succeeded, failed } = await syncQueue.runPendingOfflineSync();
    if (succeeded > 0) {
      toast({
        title: "Synchronisation",
        description:
          succeeded === 1
            ? "Une action en attente a été synchronisée."
            : `${succeeded} actions en attente ont été synchronisées.`,
      });
    }
    if (failed > 0) {
      toast({
        title: "Synchronisation partielle",
        description: "Certaines actions n’ont pas pu être synchronisées. Réessayez plus tard.",
        variant: "destructive",
      });
    }
  }, [toast]);

  if (!shouldShowBanner) return null;

  return (
    <div
      className="border-b border-destructive/40 bg-destructive px-4 py-2 text-destructive-foreground md:px-6"
      role="alert"
      aria-live="polite"
      aria-label={
        isSyncing
          ? `Synchronisation en cours. ${queueCount} actions en attente.`
          : `Hors ligne. ${queueCount} actions en attente de synchronisation.`
      }
    >
      <div className="flex items-center gap-2">
        {isSyncing ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <WifiOff className="h-4 w-4" aria-hidden />
        )}
        <p className="text-sm font-medium">
          {isSyncing
            ? `Synchronisation… ${queueCount} action${queueCount > 1 ? "s" : ""} en attente`
            : `Hors ligne · ${
                queueCount > 0
                  ? `${queueCount} action${queueCount > 1 ? "s" : ""} en file d’attente`
                  : "Mode consultation uniquement"
              }`}
        </p>
        {!isOnline && queueCount > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="ml-auto h-7 bg-white/20 px-2 text-xs font-semibold text-white hover:bg-white/30"
            onClick={() => void handleRetry()}
          >
            Sync
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function OfflineSyncIndicator() {
  const { isSyncing, queueCount, isOnline } = useOfflineBannerState();

  if (isOnline && queueCount === 0 && !isSyncing) return null;

  return (
    <Badge
      variant="secondary"
      className={isSyncing ? "h-5 min-w-5 bg-primary text-primary-foreground" : "h-5 min-w-5 bg-warning text-white"}
      aria-label={`${queueCount} actions hors ligne en attente`}
    >
      {isSyncing ? "↑" : queueCount}
    </Badge>
  );
}

interface NetworkQualityBadgeProps {
  type: NetworkType;
  effectiveType?: EffectiveType;
}

export function NetworkQualityBadge({ type, effectiveType }: NetworkQualityBadgeProps) {
  const label = useMemo(() => {
    if (type === "wifi") return "WiFi";
    if (type === "none") return "Offline";
    if (effectiveType === "2g") return "2G";
    if (effectiveType === "3g") return "3G";
    if (effectiveType === "4g") return "4G";
    return "Mobile";
  }, [type, effectiveType]);

  const toneClass = useMemo(() => {
    if (type === "none" || effectiveType === "2g") return "border-destructive/30 text-destructive";
    if (effectiveType === "3g") return "border-warning/30 text-warning";
    return "border-success/30 text-success";
  }, [type, effectiveType]);

  return (
    <Badge variant="outline" className={toneClass} aria-label={`Qualité réseau: ${label}`}>
      {label}
    </Badge>
  );
}

export function AdaptiveNetworkQualityBadge() {
  const network = useNetworkQuality();
  return <NetworkQualityBadge type={network.type} effectiveType={network.effectiveType} />;
}
