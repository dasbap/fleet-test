import { TutorialProgressRepository } from "@/repositories/tutorial-progress.repository";
import {
  enqueueTutorialSync,
  peekTutorialSyncQueue,
  shiftTutorialSyncQueue,
} from "@/features/tutorials/lib/tutorialSyncQueue";

export class TutorialProgressService {
  constructor(private readonly repository: TutorialProgressRepository) {}

  async getProgressMap(userId: string, tutorialIds: string[]) {
    return this.repository.findProgressForUser(userId, tutorialIds);
  }

  async getFavoriteIds(userId: string): Promise<Set<string>> {
    const ids = await this.repository.listFavoriteIds(userId);
    return new Set(ids);
  }

  async saveProgress(params: {
    userId: string;
    tutorialId: string;
    fleetId: string | null;
    positionSec: number;
    completed: boolean;
    isOnline: boolean;
  }): Promise<void> {
    if (!params.isOnline) {
      enqueueTutorialSync({
        type: "progress",
        tutorialId: params.tutorialId,
        fleetId: params.fleetId,
        positionSec: params.positionSec,
        completed: params.completed,
      });
      return;
    }
    await this.repository.upsertProgress({
      userId: params.userId,
      tutorialId: params.tutorialId,
      fleetId: params.fleetId,
      positionSec: params.positionSec,
      completed: params.completed,
    });
  }

  async setFavorite(params: {
    userId: string;
    tutorialId: string;
    value: boolean;
    isOnline: boolean;
  }): Promise<void> {
    if (!params.isOnline) {
      enqueueTutorialSync({
        type: "favorite",
        tutorialId: params.tutorialId,
        value: params.value,
      });
      return;
    }
    await this.repository.setFavorite(
      params.userId,
      params.tutorialId,
      params.value,
    );
  }

  async recordView(params: {
    userId: string;
    tutorialId: string;
    fleetId: string | null;
    source: "online" | "offline";
    watchedSec: number;
    isOnline: boolean;
  }): Promise<void> {
    if (!params.isOnline) {
      enqueueTutorialSync({
        type: "view",
        tutorialId: params.tutorialId,
        fleetId: params.fleetId,
        source: params.source,
        watchedSec: params.watchedSec,
      });
      return;
    }
    await this.repository.recordView(params);
  }

  async flushSyncQueue(userId: string, fleetId: string | null): Promise<number> {
    let flushed = 0;
    let op = shiftTutorialSyncQueue();
    while (op) {
      try {
        if (op.type === "progress") {
          await this.repository.upsertProgress({
            userId,
            tutorialId: op.tutorialId,
            fleetId: op.fleetId ?? fleetId,
            positionSec: op.positionSec,
            completed: op.completed,
          });
        } else if (op.type === "favorite") {
          await this.repository.setFavorite(userId, op.tutorialId, op.value);
        } else if (op.type === "view") {
          await this.repository.recordView({
            userId,
            tutorialId: op.tutorialId,
            fleetId: op.fleetId ?? fleetId,
            source: op.source,
            watchedSec: op.watchedSec,
          });
        }
        flushed += 1;
      } catch (err) {
        console.error("Tutorial sync flush failed:", err);
        break;
      }
      op = shiftTutorialSyncQueue();
    }
    return flushed;
  }

  getPendingSyncCount(): number {
    return peekTutorialSyncQueue().length;
  }
}
