import {
  VoiceCoachingRepository,
  type CoachingSessionRow,
  type GenerateCoachingInput,
  type GenerateCoachingResult,
} from "@/repositories/voice-coaching.repository";

export type CoachingSession = CoachingSessionRow;

/**
 * Logique métier coaching vocal post-trajet.
 */
export class VoiceCoachingService {
  constructor(private repository: VoiceCoachingRepository) {}

  async listSessions(driverId: string): Promise<CoachingSession[]> {
    if (!driverId) {
      throw new Error("L'identifiant conducteur est requis");
    }
    return this.repository.findSessionsByDriver(driverId);
  }

  async markPlayed(sessionId: string): Promise<void> {
    if (!sessionId) {
      throw new Error("L'identifiant de session est requis");
    }
    await this.repository.markSessionPlayed(sessionId);
  }

  async generateSession(input: GenerateCoachingInput): Promise<GenerateCoachingResult> {
    if (!input.driver_user_id || !input.fleet_id) {
      throw new Error("Conducteur et flotte requis");
    }
    if (!Number.isFinite(input.score)) {
      throw new Error("Score invalide");
    }
    return this.repository.generateCoaching(input);
  }
}
