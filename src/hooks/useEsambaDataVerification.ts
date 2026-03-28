import { useQuery } from '@tanstack/react-query';
import { EsambaVerificationService } from '@/services/esamba-verification.service';
import { EsambaVerificationRepository } from '@/repositories/esamba-verification.repository';
import type { EsambaVerificationRow } from '@/repositories/esamba-verification.repository';

const esambaVerificationRepository = new EsambaVerificationRepository();
const esambaVerificationService = new EsambaVerificationService(esambaVerificationRepository);

/** Même forme que la RPC `verifier_esamba_2024` (page Paramètres). */
export type EsambaDataVerification = EsambaVerificationRow;

/**
 * Vérifie la présence des données ESAMBA-2024 via le service (RPC verifier_esamba_2024).
 */
export function useEsambaDataVerification() {
  return useQuery<EsambaVerificationRow | null, Error>({
    queryKey: ['esamba-data-verification'],
    queryFn: () => esambaVerificationService.verify(),
  });
}
