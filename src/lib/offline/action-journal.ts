import { storageGet, storageSet } from "@/lib/storage/localStorageService";
import { IndexedDbStorageAdapter } from "@/lib/storage/adapters/indexeddb.storage-adapter";
import { CapacitorStorageAdapter } from "@/lib/storage/adapters/capacitor.storage-adapter";
import { storageKeys } from "@/lib/storage/storageKeys";
import { isNativePlatform } from "@/lib/platform";
import type {
  ActionJournalEntry,
  ActionJournalEntryStatus,
  OfflineJobType,
} from "@esamba/offline-contracts";
import { ACTION_JOURNAL_MAX_ENTRIES } from "@esamba/offline-contracts";

const JOURNAL_KEY = `${storageKeys.syncState}:action-journal`;

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readJournal(): ActionJournalEntry[] {
  return storageGet<ActionJournalEntry[]>(JOURNAL_KEY) ?? [];
}

function writeJournal(entries: ActionJournalEntry[]): void {
  storageSet(JOURNAL_KEY, entries.slice(0, ACTION_JOURNAL_MAX_ENTRIES));
}

/**
 * Journal local append-only des actions terrain (traçabilité offline).
 */
export function appendActionJournalEntry(input: {
  jobType: OfflineJobType;
  jobId: string;
  summary: string;
  status?: ActionJournalEntryStatus;
}): ActionJournalEntry {
  const entry: ActionJournalEntry = {
    id: createId(),
    jobType: input.jobType,
    jobId: input.jobId,
    summary: input.summary,
    status: input.status ?? "local",
    createdAt: new Date().toISOString(),
    syncedAt: null,
    errorMessage: null,
  };
  const next = [entry, ...readJournal()].slice(0, ACTION_JOURNAL_MAX_ENTRIES);
  writeJournal(next);
  return entry;
}

export function updateActionJournalStatus(
  jobId: string,
  status: ActionJournalEntryStatus,
  errorMessage?: string | null,
): void {
  const now = new Date().toISOString();
  const next = readJournal().map((entry) => {
    if (entry.jobId !== jobId) return entry;
    return {
      ...entry,
      status,
      syncedAt: status === "synced" ? now : entry.syncedAt,
      errorMessage: errorMessage ?? null,
    };
  });
  writeJournal(next);
}

export function getActionJournal(limit = 50): ActionJournalEntry[] {
  return readJournal().slice(0, limit);
}

export function clearActionJournal(): void {
  storageSet(JOURNAL_KEY, []);
}
