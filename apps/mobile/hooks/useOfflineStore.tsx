import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { MMKV } from "react-native-mmkv";
import {
  OFFLINE_QUEUE_MAX_ATTEMPTS,
  OFFLINE_QUEUE_MAX_SIZE,
  OFFLINE_QUEUE_SCHEMA_VERSION,
  SYNCING_STUCK_THRESHOLD_MS,
  type OfflineJob,
  type OfflineJobType,
} from "../../../packages/offline-contracts/src";
import { createQueueManager } from "../../../packages/offline-core/src";

const KEYS = { queue: "offline_queue", lastSync: "last_sync_at" } as const;

export const mmkvQueue = new MMKV({ id: "esamba-queue" });
export const mmkvMeta = new MMKV({ id: "esamba-meta" });

const queueManager = createQueueManager<OfflineJob>(
  {
    read: async () => {
      const raw = mmkvQueue.getString(KEYS.queue);
      return raw ? (JSON.parse(raw) as OfflineJob[]) : [];
    },
    write: async (jobs) => {
      mmkvQueue.set(KEYS.queue, JSON.stringify(jobs));
    },
  },
  {
    maxAttempts: OFFLINE_QUEUE_MAX_ATTEMPTS,
    maxQueueSize: OFFLINE_QUEUE_MAX_SIZE,
    schemaVersion: OFFLINE_QUEUE_SCHEMA_VERSION,
  },
);

interface OfflineStoreContextValue {
  isOnline: boolean;
  stats: { pending: number; syncing: number; failed: number };
  isFlushing: boolean;
  enqueueAction: (type: OfflineJobType, payload: Record<string, unknown>) => Promise<void>;
  flush: () => Promise<void>;
}

const OfflineStoreContext = createContext<OfflineStoreContextValue | null>(null);

async function refreshStats(): Promise<{ pending: number; syncing: number; failed: number }> {
  return queueManager.getQueueStats();
}

export function OfflineStoreProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({ pending: 0, syncing: 0, failed: 0 });
  const [isFlushing, setIsFlushing] = useState(false);
  const syncLock = useRef(false);

  const flush = useCallback(async () => {
    if (syncLock.current || !isOnline) return;
    syncLock.current = true;
    setIsFlushing(true);
    try {
      await queueManager.recoverStuckSyncingJobs(SYNCING_STUCK_THRESHOLD_MS);
      const pending = await queueManager.getPendingJobs();
      for (const job of pending) {
        const marked = await queueManager.markSyncing(job.id);
        if (!marked) continue;
        // Exécuteur métier branché via sync web partagée (phase 2+)
        await queueManager.markSucceeded(marked.id);
      }
      mmkvMeta.set(KEYS.lastSync, new Date().toISOString());
      setStats(await refreshStats());
    } finally {
      setIsFlushing(false);
      syncLock.current = false;
    }
  }, [isOnline]);

  const enqueueAction = useCallback(async (type: OfflineJobType, payload: Record<string, unknown>) => {
    await queueManager.enqueue({
      type,
      payload,
      entityRef: null,
    });
    setStats(await refreshStats());
  }, []);

  useEffect(() => {
    void queueManager.recoverStuckSyncingJobs(SYNCING_STUCK_THRESHOLD_MS);
    void refreshStats().then(setStats);

    const netSub = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      if (online) void flush();
    });

    const appSub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active" && isOnline) void flush();
    });

    return () => {
      netSub();
      appSub.remove();
    };
  }, [flush, isOnline]);

  const value = useMemo(
    () => ({ isOnline, stats, isFlushing, enqueueAction, flush }),
    [isOnline, stats, isFlushing, enqueueAction, flush],
  );

  return <OfflineStoreContext.Provider value={value}>{children}</OfflineStoreContext.Provider>;
}

export function useOfflineStore(): OfflineStoreContextValue {
  const ctx = useContext(OfflineStoreContext);
  if (!ctx) throw new Error("useOfflineStore requiert OfflineStoreProvider");
  return ctx;
}