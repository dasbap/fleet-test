import type {
  Persister,
  PersistedClient,
} from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { CapacitorStorageAdapter } from "@/lib/storage/adapters/capacitor.storage-adapter";
import { isNativePlatform } from "@/lib/platform";

const QUERY_CACHE_KEY = "tanstack-query-cache-v1";
const CAPACITOR_CACHE_KEY = "tanstack-query-cache-native-v1";

const capacitorStorageAdapter = new CapacitorStorageAdapter();

function createNativePersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await capacitorStorageAdapter.setItem(CAPACITOR_CACHE_KEY, client);
    },
    restoreClient: async () => {
      const cached = await capacitorStorageAdapter.getItem<PersistedClient>(CAPACITOR_CACHE_KEY);
      return cached ?? undefined;
    },
    removeClient: async () => {
      await capacitorStorageAdapter.removeItem(CAPACITOR_CACHE_KEY);
    },
  };
}

function createWebPersister(): Persister | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return createSyncStoragePersister({
    storage: window.localStorage,
    key: QUERY_CACHE_KEY,
  });
}

export function getQueryPersister(): Persister | null {
  if (isNativePlatform()) {
    return createNativePersister();
  }
  return createWebPersister();
}
