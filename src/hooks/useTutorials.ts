import { useQuery } from "@tanstack/react-query";
import { TutorialRepository } from "@/repositories/tutorial.repository";
import { TutorialService, type TutorialListFilters } from "@/services/tutorial.service";
import { TutorialProgressRepository } from "@/repositories/tutorial-progress.repository";
import { TutorialProgressService } from "@/services/tutorial-progress.service";
import { readTutorialListCache, writeTutorialListCache } from "@/features/tutorials/lib/tutorialCache";
import { useAuth } from "@/hooks/useAuth";

const tutorialRepository = new TutorialRepository();
const tutorialService = new TutorialService(tutorialRepository);
const tutorialProgressRepository = new TutorialProgressRepository();
const tutorialProgressService = new TutorialProgressService(tutorialProgressRepository);

export function useTutorials(filters?: TutorialListFilters) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["tutorials", filters?.categorySlug ?? "all", userId],
    queryFn: async () => {
      const items = await tutorialService.getTutorials(filters);
      writeTutorialListCache(items);

      if (!userId) {
        return tutorialService.mergeUserState(items, {}, new Set());
      }

      const ids = items.map((t) => t.id);
      const [progressMap, favoriteIds] = await Promise.all([
        tutorialProgressService.getProgressMap(userId, ids),
        tutorialProgressService.getFavoriteIds(userId),
      ]);

      const progressRecord: Record<string, { position_sec: number; completed_at: string | null }> =
        {};
      for (const [tid, row] of Object.entries(progressMap)) {
        progressRecord[tid] = {
          position_sec: row.position_sec,
          completed_at: row.completed_at,
        };
      }

      return tutorialService.mergeUserState(items, progressRecord, favoriteIds);
    },
    placeholderData: () => {
      const cached = readTutorialListCache();
      if (!cached?.length) return undefined;
      return tutorialService.mergeUserState(cached, {}, new Set());
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useTutorial(tutorialId: string) {
  return useQuery({
    queryKey: ["tutorials", tutorialId],
    queryFn: () => tutorialService.getTutorialById(tutorialId),
    enabled: tutorialId.trim().length > 0,
    staleTime: 1000 * 60 * 10,
  });
}

export { tutorialService, tutorialProgressService };
