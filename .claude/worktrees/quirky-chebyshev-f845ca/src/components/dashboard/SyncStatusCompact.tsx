import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOfflineSyncStatus } from "@/hooks/useOfflineSyncStatus";
import type { AccountSyncDisplayStatus } from "@/types/account-preferences";

const syncLabels: Record<AccountSyncDisplayStatus, string> = {
  synced: "Données à jour",
  syncing: "Synchronisation…",
  pending: "En attente d’envoi",
  error: "Erreur de sync",
};

function SyncIcon({ status }: { status: AccountSyncDisplayStatus }) {
  if (status === "syncing") {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />;
  }
  if (status === "error") {
    return <CloudOff className="text-destructive h-4 w-4 shrink-0" aria-hidden />;
  }
  if (status === "pending") {
    return <Cloud className="text-warning h-4 w-4 shrink-0" aria-hidden />;
  }
  return <Cloud className="h-4 w-4 shrink-0 text-success" aria-hidden />;
}

/**
 * Bandeau compact : état de synchronisation locale (file d’attente, erreurs).
 * La connectivité réseau est affichée séparément via OfflineBadge dans le header.
 */
export function SyncStatusCompact({ className }: { className?: string }) {
  const { displayStatus } = useOfflineSyncStatus();

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2 text-sm md:px-6",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <SyncIcon status={displayStatus} />
      <Badge
        variant="outline"
        className={cn(
          "font-normal",
          displayStatus === "synced" && "border-success/30 text-success",
          displayStatus === "syncing" && "border-primary/30 text-primary",
          displayStatus === "pending" && "border-warning/30 text-warning",
          displayStatus === "error" && "border-destructive/30 text-destructive",
        )}
      >
        {syncLabels[displayStatus]}
      </Badge>
    </div>
  );
}
