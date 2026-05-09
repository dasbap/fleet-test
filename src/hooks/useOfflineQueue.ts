import { useCallback, useEffect, useRef, useState } from "react";
import { useNetworkOnline } from "@/features/account/hooks/useNetworkOnline";
import { runOfflineSyncOnce } from "@/services/offlineSyncOrchestrator.service";
import { OfflineQueueService } from "@/services/offlineQueue.service";
import { patchLocalSyncState } from "@/lib/storage/flotteEsambaLocalCache";

const queueService = new OfflineQueueService();

export interface OfflineQueueStats {
  pending: number;
  syncing: number;
  failed: number;
  oldestPendingAgeMs: number | null;
}

const EMPTY_STATS: OfflineQueueStats = {
  pending: 0,
  syncing: 0,
  failed: 0,
  oldestPendingAgeMs: null,
};

/**
 * Expose les statistiques de la file offline et permet un flush manuel.
 *
 * Fonctionnalités :
 * - Recharge les stats toutes les 15 s quand la page est visible
 * - Déclenche automatiquement un flush dès que le réseau revient en ligne
 * - `flush()` peut être appelé manuellement depuis n'importe quel composant
 */
export function useOfflineQueue() {
  const isOnline = useNetworkOnline();
  const [stats, setStats] = useState<OfflineQueueStats>(EMPTY_STATS);
  const [isFlushing, setIsFlushing] = useState(false);
  const prevOnline = useRef(isOnline);

  const refreshStats = useCallback(async () => {
    try {
      const s = await queueService.getQueueStats();
      setStats(s);
    } catch {
      // Silencieux — l'UI reste fonctionnelle
    }
  }, []);

  const flush = useCallback(async () => {
    if (isFlushing) return;
    setIsFlushing(true);
    patchLocalSyncState({ displayStatus: "syncing", lastSyncError: null });
    try {
      await runOfflineSyncOnce();
    } finally {
      setIsFlushing(false);
      await refreshStats();
    }
  }, [isFlushing, refreshStats]);

  // Rafraîchissement périodique des stats (15 s)
  useEffect(() => {
    void refreshStats();
    const id = setInterval(() => void refreshStats(), 15_000);
    return () => clearInterval(id);
  }, [refreshStats]);

  // Flush automatique quand le réseau revient en ligne
  useEffect(() => {
    const wasOffline = !prevOnline.current;
    const nowOnline = isOnline;
    prevOnline.current = isOnline;

    if (wasOffline && nowOnline) {
      void flush();
    }
  }, [isOnline, flush]);

  return {
    stats,
    isFlushing,
    isOnline,
    flush,
    hasPending: stats.pending > 0 || stats.syncing > 0,
    hasFailed: stats.failed > 0,
  };
}
