import type { QueueStorage } from "../../../../packages/offline-core/src";
import { readOfflineJobs, writeOfflineJobs } from "@/lib/storage/offline-queue.storage";
import type { OfflineJob } from "@/types/offline-queue";

export const webOfflineQueueStorage: QueueStorage<OfflineJob> = {
  read: readOfflineJobs,
  write: writeOfflineJobs,
};
