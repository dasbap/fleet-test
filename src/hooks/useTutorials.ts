import { useQuery } from "@tanstack/react-query";
import { TutorialRepository } from "@/repositories/tutorial.repository";
import { TutorialService } from "@/services/tutorial.service";

const tutorialRepository = new TutorialRepository();
const tutorialService = new TutorialService(tutorialRepository);

export function useTutorials() {
  return useQuery({
    queryKey: ["tutorials"],
    queryFn: () => tutorialService.getTutorials(),
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
