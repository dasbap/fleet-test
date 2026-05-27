/**
 * File d'attente locale pour synchroniser progression / favoris hors ligne.
 */

export type TutorialSyncOperation =
  | {
      type: "progress";
      tutorialId: string;
      fleetId: string | null;
      positionSec: number;
      completed: boolean;
      queuedAtIso: string;
    }
  | {
      type: "favorite";
      tutorialId: string;
      value: boolean;
      queuedAtIso: string;
    }
  | {
      type: "view";
      tutorialId: string;
      fleetId: string | null;
      source: "online" | "offline";
      watchedSec: number;
      queuedAtIso: string;
    };

const QUEUE_KEY = "esamba-tutorial-sync-queue-v1";

function readQueue(): TutorialSyncOperation[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TutorialSyncOperation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(ops: TutorialSyncOperation[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
}

export function enqueueTutorialSync(op: Omit<TutorialSyncOperation, "queuedAtIso">): void {
  const queue = readQueue();
  queue.push({ ...op, queuedAtIso: new Date().toISOString() } as TutorialSyncOperation);
  writeQueue(queue);
}

export function peekTutorialSyncQueue(): TutorialSyncOperation[] {
  return readQueue();
}

export function shiftTutorialSyncQueue(): TutorialSyncOperation | null {
  const queue = readQueue();
  if (queue.length === 0) return null;
  const [first, ...rest] = queue;
  writeQueue(rest);
  return first ?? null;
}

export function clearTutorialSyncQueue(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(QUEUE_KEY);
}
