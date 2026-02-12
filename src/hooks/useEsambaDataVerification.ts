import { useQuery } from '@tanstack/react-query';
import { EsambaVerificationService } from '@/services/esamba-verification.service';
import { EsambaVerificationRepository } from '@/repositories/esamba-verification.repository';

const esambaVerificationRepository = new EsambaVerificationRepository();
const esambaVerificationService = new EsambaVerificationService(esambaVerificationRepository);

export interface EsambaDataVerification {
  organisation: boolean;
  flotte: boolean;
  membership_organizer: boolean;
  vehicule_esamba_001: boolean;
  invitation_esamba_2024: boolean;
}

/**
 * Vérifie la présence des données ESAMBA-2024 via le service (RPC verifier_esamba_2024).
 */
export function useEsambaDataVerification() {
  return useQuery<EsambaDataVerification | null, Error>({
    queryKey: ['esamba-data-verification'],
    queryFn: () => esambaVerificationService.verify(),
  });
}
