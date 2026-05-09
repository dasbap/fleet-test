import { storageGet, storageSet } from "@/lib/storage/localStorageService";
import { IndexedDbStorageAdapter } from "@/lib/storage/adapters/indexeddb.storage-adapter";
import { storageKeys } from "@/lib/storage/storageKeys";
import type { OfflineJob } from "@/types/offline-queue";

const indexedDbAdapter = new IndexedDbStorageAdapter();
const LEGACY_OFFLINE_QUEUE_KEY = `${storageKeys.incidentDrafts}:jobs`;
const OFFLINE_QUEUE_KEY = storageKeys.offlineQueue;

let hasMigratedLegacyQueue = false;

export async function readOfflineJobs(): Promise<OfflineJob[]> {
  try {
    const jobs = await indexedDbAdapter.getItem<OfflineJob[]>(OFFLINE_QUEUE_KEY);
    if (jobs) {
      return jobs;
    }
  } catch {
    // Fallback localStorage ci-dessous.
  }

  const legacyJobs = storageGet<OfflineJob[]>(LEGACY_OFFLINE_QUEUE_KEY) ?? [];
  if (legacyJobs.length > 0 && !hasMigratedLegacyQueue) {
    await writeOfflineJobs(legacyJobs);
    hasMigratedLegacyQueue = true;
  }
  return legacyJobs;
}

export async function writeOfflineJobs(jobs: OfflineJob[]): Promise<void> {
  try {
    await indexedDbAdapter.setItem(OFFLINE_QUEUE_KEY, jobs);
    return;
  } catch {
    storageSet(OFFLINE_QUEUE_KEY, jobs);
  }
}

