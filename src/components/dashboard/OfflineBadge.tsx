import { Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNetworkOnline } from "@/features/account/hooks/useNetworkOnline";
import { cn } from "@/lib/utils";

/**
 * Indicateur compact de connectivité pour le header (PWA / réseau instable).
 */
export function OfflineBadge({ className }: { className?: string }) {
  const online = useNetworkOnline();

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      aria-live="polite"
      aria-label={online ? "En ligne" : "Hors ligne"}
    >
      {online ? (
        <Wifi className="h-4 w-4 shrink-0 text-success" aria-hidden />
      ) : (
        <WifiOff className="text-warning h-4 w-4 shrink-0" aria-hidden />
      )}
      <Badge
        variant="outline"
        className={cn(
          "hidden font-normal sm:inline-flex",
          online && "border-success/30 text-success",
          !online && "border-warning/30 text-warning",
        )}
      >
        {online ? "En ligne" : "Hors ligne"}
      </Badge>
    </div>
  );
}
