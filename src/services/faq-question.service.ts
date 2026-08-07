import { FaqQuestionRepository } from "@/repositories/faq-question.repository";
import type { FaqQuestion } from "@/types/faq-question";

export class FaqQuestionService {
  constructor(private repository: FaqQuestionRepository) {}

  async submitQuestion(question: string, parentQuestionId?: string | null): Promise<FaqQuestion> {
    const trimmed = question.trim();
    if (trimmed.length < 8) {
      throw new Error("La question doit contenir au moins 8 caracteres.");
    }
    return this.repository.submitQuestion(trimmed, parentQuestionId);
  }

  async listForAdmin(includeAnswered = false): Promise<FaqQuestion[]> {
    return this.repository.listForAdmin(includeAnswered);
  }

  async answerQuestion(questionId: string, answer: string): Promise<FaqQuestion> {
    if (!questionId) {
      throw new Error("Question introuvable.");
    }
    const trimmed = answer.trim();
    if (trimmed.length < 3) {
      throw new Error("La reponse est requise.");
    }
    return this.repository.answerQuestion(questionId, trimmed);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    if (!questionId) {
      throw new Error("Question introuvable.");
    }
    await this.repository.deleteQuestion(questionId);
  }
}
