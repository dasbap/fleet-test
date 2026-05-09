export interface QueueJob<TType extends string = string, TPayload = Record<string, unknown>> {
  id: string;
  type: TType;
  payload: TPayload;
  schemaVersion: number;
  idempotencyKey: string;
  entityRef: string | null;
  status: "pending" | "syncing" | "succeeded" | "failed";
  attemptCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueueStats {
  pending: number;
  syncing: number;
  failed: number;
  oldestPendingAgeMs: number | null;
}

export interface QueueStorage<TJob extends QueueJob> {
  read(): Promise<TJob[]>;
  write(jobs: TJob[]): Promise<void>;
}

export interface QueuePolicy {
  maxAttempts: number;
  maxQueueSize: number;
  schemaVersion: number;
}

export interface FlushResult {
  processed: number;
  succeeded: number;
  failed: number;
}

export interface CachedVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  status: string;
  km: number;
  blurhash: string | null;
  cachedAt: string;
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  effectiveType?: string;
}
