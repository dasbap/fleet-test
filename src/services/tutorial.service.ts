import type { TutorialItem } from "@/repositories/tutorial.repository";
import { TutorialRepository } from "@/repositories/tutorial.repository";

export interface TutorialListFilters {
  categorySlug?: string;
  limit?: number;
  offset?: number;
}

export interface TutorialWithUserState extends TutorialItem {
  positionSec: number;
  completed: boolean;
  isFavorite: boolean;
}

export class TutorialService {
  constructor(private readonly repository: TutorialRepository) {}

  async getTutorials(filters?: TutorialListFilters): Promise<TutorialItem[]> {
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    let items = await this.repository.findAll(limit, offset);
    if (filters?.categorySlug) {
      items = items.filter((t) => t.categorySlug === filters.categorySlug);
    }
    return items;
  }

  async getTutorialById(tutorialId: string): Promise<TutorialItem> {
    const normalized = tutorialId.trim();
    if (!normalized) {
      throw new Error("Identifiant de tutoriel invalide.");
    }
    const tutorial = await this.repository.findById(normalized);
    if (!tutorial) {
      throw new Error("Tutoriel introuvable.");
    }
    return tutorial;
  }

  mergeUserState(
    tutorials: TutorialItem[],
    progressMap: Record<string, { position_sec: number; completed_at: string | null }>,
    favoriteIds: Set<string>,
  ): TutorialWithUserState[] {
    return tutorials.map((t) => {
      const progress = progressMap[t.id];
      return {
        ...t,
        positionSec: progress?.position_sec ?? 0,
        completed: Boolean(progress?.completed_at),
        isFavorite: favoriteIds.has(t.id),
      };
    });
  }
}
