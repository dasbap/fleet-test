import { useMemo, useSyncExternalStore } from "react";

import { useNetworkOnline } from "@/features/account/hooks/useNetworkOnline";
import {
  getOfflineCacheSnapshot,
  subscribeLocalCache,
} from "@/lib/storage/flotteEsambaLocalCache";
import type { AccountSyncDisplayStatus } from "@/types/account-preferences";
import type { LocalSyncState } from "@/types/local-cache";

function deriveDisplayStatus(
  sync: LocalSyncState,
  pendingDrafts: number,
): AccountSyncDisplayStatus {
  if (sync.displayStatus === "syncing") return "syncing";
  if (sync.displayStatus === "error") return "error";
  if (pendingDrafts > 0) return "pending";
  return "synced";
}

/**
 * État hors ligne / synchronisation : cache local + connectivité.
 * À utiliser pour l’écran Compte et tout indicateur global.
 */
export function useOfflineSyncStatus() {
  const snapshot = useSyncExternalStore(
    subscribeLocalCache,
    getOfflineCacheSnapshot,
    getOfflineCacheSnapshot,
  );
  const online = useNetworkOnline();

  const pendingDrafts = snapshot.pendingDrafts;

  const displayStatus = useMemo(
    () => deriveDisplayStatus(snapshot.sync, pendingDrafts),
    [snapshot.sync, pendingDrafts],
  );

  return {
    displayStatus,
    pendingIncidentDraftsCount: pendingDrafts,
    lastSuccessfulSyncAt: snapshot.sync.lastSuccessfulSyncAt,
    lastSyncError: snapshot.sync.lastSyncError,
    isOnline: online,
    localSession: snapshot.session,
    recentMissions: snapshot.recentMissions,
    recentVehicles: snapshot.recentVehicles,
  };
}
