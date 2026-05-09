import { EsambaVerificationRepository } from '@/repositories/esamba-verification.repository';
import type { EsambaVerificationRow } from '@/repositories/esamba-verification.repository';

export class EsambaVerificationService {
  constructor(private repository: EsambaVerificationRepository) {}

  async verify(): Promise<EsambaVerificationRow | null> {
    try {
      return await this.repository.verify();
    } catch {
      throw new Error("Erreur lors de l'exécution de la vérification ESAMBA.");
    }
  }
}
