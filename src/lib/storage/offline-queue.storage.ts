import { storageGet, storageSet } from "@/lib/storage/localStorageService";
import { IndexedDbStorageAdapter } from "@/lib/storage/adapters/indexeddb.storage-adapter";
import { CapacitorStorageAdapter } from "@/lib/storage/adapters/capacitor.storage-adapter";
import { storageKeys } from "@/lib/storage/storageKeys";
import { isNativePlatform } from "@/lib/platform";
import type { OfflineJob } from "@/types/offline-queue";

const indexedDbAdapter = new IndexedDbStorageAdapter();
const capacitorAdapter = new CapacitorStorageAdapter();
const LEGACY_OFFLINE_QUEUE_KEY = `${storageKeys.incidentDrafts}:jobs`;
const OFFLINE_QUEUE_KEY = storageKeys.offlineQueue;

let hasMigratedLegacyQueue = false;

async function readFromPrimary(): Promise<OfflineJob[] | null> {
  if (isNativePlatform()) {
    return capacitorAdapter.getItem<OfflineJob[]>(OFFLINE_QUEUE_KEY);
  }
  try {
    return await indexedDbAdapter.getItem<OfflineJob[]>(OFFLINE_QUEUE_KEY);
  } catch {
    return null;
  }
}

async function writeToPrimary(jobs: OfflineJob[]): Promise<boolean> {
  if (isNativePlatform()) {
    await capacitorAdapter.setItem(OFFLINE_QUEUE_KEY, jobs);
    return true;
  }
  try {
    await indexedDbAdapter.setItem(OFFLINE_QUEUE_KEY, jobs);
    return true;
  } catch {
    return false;
  }
}

export async function readOfflineJobs(): Promise<OfflineJob[]> {
  const primary = await readFromPrimary();
  if (primary) {
    return primary;
  }

  const legacyJobs = storageGet<OfflineJob[]>(LEGACY_OFFLINE_QUEUE_KEY) ?? [];
  if (legacyJobs.length > 0 && !hasMigratedLegacyQueue) {
    await writeOfflineJobs(legacyJobs);
    hasMigratedLegacyQueue = true;
  }
  return legacyJobs;
}

export async function writeOfflineJobs(jobs: OfflineJob[]): Promise<void> {
  const ok = await writeToPrimary(jobs);
  if (!ok) {
    storageSet(OFFLINE_QUEUE_KEY, jobs);
  }
}
