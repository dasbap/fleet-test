import { MMKV } from "react-native-mmkv";
import type { QueueStorage, QueueJob } from "../../../../packages/offline-core/src";

const OFFLINE_QUEUE_KEY = "offline_queue";

export function createMmkvQueueStorage<TJob extends QueueJob>(
  instance: MMKV = new MMKV({ id: "esamba-queue" }),
): QueueStorage<TJob> {
  return {
    read: async () => {
      const raw = instance.getString(OFFLINE_QUEUE_KEY);
      return raw ? (JSON.parse(raw) as TJob[]) : [];
    },
    write: async (jobs) => {
      instance.set(OFFLINE_QUEUE_KEY, JSON.stringify(jobs));
    },
  };
}
