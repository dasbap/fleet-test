import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { MMKV } from "react-native-mmkv";
import type { QueryClient } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { createQueueManager, getRecentVehicles, upsertVehicleCache, type CachedVehicle, type NetworkStatus } from "../../../packages/offline-core/src";

export interface OfflineAction {
  id: string;
  type: "creneau_open" | "creneau_close" | "incident_report" | "fuel_entry" | "maintenance_note";
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
  userId: string;
}

interface OfflineActionQueueItem {
  id: string;
  type: OfflineAction["type"];
  payload: Record<string, unknown>;
  entityRef: string | null;
  schemaVersion: number;
  idempotencyKey: string;
  status: "pending" | "syncing" | "succeeded" | "failed";
  attemptCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

const KEYS = {
  queue: "offline_queue",
  vehicleCache: "vehicle_cache",
  networkStatus: "network_status",
  lastSync: "last_sync_at",
} as const;

const MAX_VEHICLE_CACHE = 20;

export const mmkvMain = new MMKV({ id: "esamba-main" });
export const mmkvQueue = new MMKV({ id: "esamba-queue" });
export const mmkvMeta = new MMKV({ id: "esamba-meta" });

const queueManager = createQueueManager<OfflineActionQueueItem>(
  {
    read: async () => {
      const raw = mmkvQueue.getString(KEYS.queue);
      return raw ? (JSON.parse(raw) as OfflineActionQueueItem[]) : [];
    },
    write: async (jobs) => {
      mmkvQueue.set(KEYS.queue, JSON.stringify(jobs));
    },
  },
  {
    maxAttempts: 3,
    maxQueueSize: 200,
    schemaVersion: 1,
  },
);

export function setupOfflineQueryPersistence(queryClient: QueryClient): void {
  const persister = createSyncStoragePersister({
    storage: {
      getItem: (key) => mmkvMain.getString(key) ?? null,
      setItem: (key, value) => mmkvMain.set(key, value),
      removeItem: (key) => mmkvMain.delete(key),
    },
    throttleTime: 2_000,
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: 24 * 60 * 60 * 1000,
    buster: "1",
  });
}

export interface UseOfflineStoreReturn {
  isOnline: boolean;
  networkType: string;
  is2G: boolean;
  queueCount: number;
  isSyncing: boolean;
  lastSyncAt: string | null;
  queueAction: (action: Pick<OfflineAction, "type" | "payload" | "userId">) => Promise<void>;
  flushQueue: () => Promise<{ synced: number; failed: number }>;
  getCachedVehicle: (id: string) => CachedVehicle | null;
  cacheVehicle: (vehicle: Omit<CachedVehicle, "cachedAt">) => void;
  getRecentVehicles: (hours?: number) => CachedVehicle[];
}

export function useOfflineStore(
  executeAction: (action: OfflineAction) => Promise<void>,
): UseOfflineStoreReturn {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: "wifi",
  });
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => mmkvMeta.getString(KEYS.lastSync) ?? null);
  const syncLock = useRef(false);

  useEffect(() => {
    setQueueCount(mmkvQueue.getString(KEYS.queue) ? JSON.parse(mmkvQueue.getString(KEYS.queue) ?? "[]").length : 0);
  }, []);

  const flushQueue = useCallback(async () => {
    if (syncLock.current || !networkStatus.isConnected) {
      return { synced: 0, failed: 0 };
    }

    syncLock.current = true;
    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    await queueManager.flush(async (job) => {
      const action: OfflineAction = {
        id: job.id,
        type: job.type,
        payload: job.payload,
        createdAt: job.createdAt,
        retries: job.attemptCount,
        userId: String(job.payload.userId ?? ""),
      };

      const marked = await queueManager.markSyncing(job.id);
      if (!marked) return false;

      try {
        await executeAction(action);
        await queueManager.markSucceeded(job.id);
        synced += 1;
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        await queueManager.markFailed(job.id, message);
        failed += 1;
        return false;
      }
    });

    const now = new Date().toISOString();
    mmkvMeta.set(KEYS.lastSync, now);
    setLastSyncAt(now);
    setQueueCount((await queueManager.getPendingJobs()).length);
    setIsSyncing(false);
    syncLock.current = false;

    return { synced, failed };
  }, [executeAction, networkStatus.isConnected]);

  const queueAction = useCallback(
    async (action: Pick<OfflineAction, "type" | "payload" | "userId">) => {
      await queueManager.enqueue({
        type: action.type,
        payload: { ...action.payload, userId: action.userId },
        entityRef: null,
      });
      setQueueCount((await queueManager.getPendingJobs()).length);
    },
    [],
  );

  const getAllCachedVehicles = (): CachedVehicle[] => {
    try {
      const raw = mmkvMain.getString(KEYS.vehicleCache);
      return raw ? (JSON.parse(raw) as CachedVehicle[]) : [];
    } catch {
      return [];
    }
  };

  const cacheVehicle = (vehicle: Omit<CachedVehicle, "cachedAt">): void => {
    const updated = upsertVehicleCache(getAllCachedVehicles(), vehicle, MAX_VEHICLE_CACHE);
    mmkvMain.set(KEYS.vehicleCache, JSON.stringify(updated));
  };

  const getCachedVehicle = (id: string): CachedVehicle | null => {
    return getAllCachedVehicles().find((vehicle) => vehicle.id === id) ?? null;
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const status: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        effectiveType: (state.details as { cellularGeneration?: string })?.cellularGeneration ?? undefined,
      };
      setNetworkStatus(status);
      mmkvMeta.set(KEYS.networkStatus, JSON.stringify(status));

      if (status.isConnected && status.isInternetReachable) {
        void flushQueue();
      }
    });

    return () => unsubscribe();
  }, [flushQueue]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active" && networkStatus.isConnected) {
        void flushQueue();
      }
    });
    return () => sub.remove();
  }, [flushQueue, networkStatus.isConnected]);

  const is2G =
    networkStatus.effectiveType === "2g" ||
    (networkStatus.type === "cellular" && !networkStatus.isInternetReachable);

  return {
    isOnline: networkStatus.isConnected && (networkStatus.isInternetReachable ?? true),
    networkType: networkStatus.type,
    is2G,
    queueCount,
    isSyncing,
    lastSyncAt,
    queueAction,
    flushQueue,
    getCachedVehicle,
    cacheVehicle,
    getRecentVehicles: (hours = 24) => getRecentVehicles(getAllCachedVehicles(), hours),
  };
}
