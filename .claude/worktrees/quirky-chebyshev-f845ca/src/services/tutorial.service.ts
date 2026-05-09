import type { TutorialItem } from "@/repositories/tutorial.repository";
import { TutorialRepository } from "@/repositories/tutorial.repository";

export class TutorialService {
  constructor(private readonly repository: TutorialRepository) {}

  async getTutorials(): Promise<TutorialItem[]> {
    return this.repository.list();
  }

  async getTutorialById(tutorialId: string): Promise<TutorialItem> {
    const tutorials = this.repository.list();
    const tutorial = tutorials.find((item) => item.id === tutorialId);
    if (!tutorial) {
      throw new Error("Tutoriel introuvable.");
    }
    return tutorial;
  }
}
