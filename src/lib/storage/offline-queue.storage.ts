import { storageGet, storageSet } from "@/lib/storage/localStorageService";
import { storageKeys } from "@/lib/storage/storageKeys";
import type { OfflineJob } from "@/types/offline-queue";

const OFFLINE_QUEUE_KEY = `${storageKeys.incidentDrafts}:jobs`;

export function readOfflineJobs(): OfflineJob[] {
  return storageGet<OfflineJob[]>(OFFLINE_QUEUE_KEY) ?? [];
}

export function writeOfflineJobs(jobs: OfflineJob[]): void {
  storageSet(OFFLINE_QUEUE_KEY, jobs);
}

