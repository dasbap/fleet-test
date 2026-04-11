import type { FeedbackNpsTrigger } from "@/repositories/feedback.repository";
import { FeedbackRepository } from "@/repositories/feedback.repository";

export interface SubmitFeedbackInput {
  fleetId: string;
  userId: string;
  message: string;
  rating: 1 | 2 | 3 | 4 | 5;
  npsTrigger?: FeedbackNpsTrigger | null;
  entityId?: string | null;
  entityType?: "vehicle" | "maintenance" | "alert" | null;
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

    let normalizedMessage = input.message.trim();
    if (!normalizedMessage) {
      // Note seule : le message reste obligatoire côté base ; formulation explicite pour l’analyse.
      normalizedMessage = `Note seule : ${input.rating}/5`;
    }

    if (input.rating < 1 || input.rating > 5) {
      throw new Error("La note doit être comprise entre 1 et 5.");
    }

    await this.repository.create({
      fleet_id: input.fleetId,
      user_id: input.userId,
      message: normalizedMessage,
      rating: input.rating,
      nps_trigger: input.npsTrigger ?? null,
      entity_id: input.entityId ?? null,
      entity_type: input.entityType ?? null,
    });
  }
}
