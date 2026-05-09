import { Cloud, CloudOff, Loader2, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AccountSyncDisplayStatus } from "@/types/account-preferences";
import { useNetworkOnline } from "@/features/account/hooks/useNetworkOnline";

interface SyncStatusIndicatorProps {
  syncStatus: AccountSyncDisplayStatus;
  className?: string;
}

const syncLabels: Record<AccountSyncDisplayStatus, string> = {
  synced: "Données à jour",
  syncing: "Synchronisation…",
  pending: "En attente d’envoi",
  error: "Erreur de sync",
};

function SyncIcon({ status }: { status: AccountSyncDisplayStatus }) {
  if (status === "syncing") {
    return <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />;
  }
  if (status === "error") {
    return <CloudOff className="text-destructive h-5 w-5 shrink-0" aria-hidden />;
  }
  if (status === "pending") {
    return <Cloud className="text-warning h-5 w-5 shrink-0" aria-hidden />;
  }
  return <Cloud className="h-5 w-5 shrink-0 text-success" aria-hidden />;
}

/**
 * Connectivité réseau + état de synchronisation hors ligne (affichage simulé).
 */
export function SyncStatusIndicator({
  syncStatus,
  className,
}: SyncStatusIndicatorProps) {
  const online = useNetworkOnline();

  return (
    <div className={cn("flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-start gap-3">
        {online ? (
          <Wifi className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
        ) : (
          <WifiOff className="text-warning mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        )}
        <div>
          <p className="font-medium text-sm">Connectivité</p>
          <p className="text-muted-foreground text-xs">
            {online
              ? "Vous êtes en ligne."
              : "Mode hors ligne — les actions seront mises en file d’attente."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <SyncIcon status={syncStatus} />
        <Badge
          variant="outline"
          className={cn(
            "font-normal",
            syncStatus === "synced" && "border-success/30 text-success",
            syncStatus === "syncing" && "border-primary/30 text-primary",
            syncStatus === "pending" && "border-warning/30 text-warning",
            syncStatus === "error" && "border-destructive/30 text-destructive"
          )}
        >
          {syncLabels[syncStatus]}
        </Badge>
      </div>
    </div>
  );
}
