import { FeedbackRepository } from "@/repositories/feedback.repository";

export interface SubmitFeedbackInput {
  fleetId: string;
  userId: string;
  message: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

export class FeedbackService {
  constructor(private repository: FeedbackRepository) {}

  async submitFeedback(input: SubmitFeedbackInput): Promise<void> {
    if (!input.fleetId) {
      throw new Error("La flotte active est requise pour envoyer un feedback.");
    }

    if (!input.userId) {
      throw new Error("Utilisateur non authentifié.");
    }

    const normalizedMessage = input.message.trim();
    if (!normalizedMessage) {
      throw new Error("Le message de feedback est requis.");
    }

    if (input.rating < 1 || input.rating > 5) {
      throw new Error("La note doit être comprise entre 1 et 5.");
    }

    await this.repository.create({
      fleet_id: input.fleetId,
      user_id: input.userId,
      message: normalizedMessage,
      rating: input.rating,
    });
  }
}
