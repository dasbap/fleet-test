import { useQuery } from '@tanstack/react-query';
import { AvatarRepository } from '@/repositories/avatar.repository';
import { AvatarService } from '@/services/avatar.service';

const avatarRepository = new AvatarRepository();
const avatarService = new AvatarService(avatarRepository);

/** URL d'affichage avatar (signée si stockage privé). */
export function useAvatarDisplayUrl(avatarUrlOrPath: string | null | undefined) {
  return useQuery({
    queryKey: ['avatar-display-url', avatarUrlOrPath ?? ''],
    queryFn: () => avatarService.resolveAvatarDisplayUrl(avatarUrlOrPath),
    enabled: Boolean(avatarUrlOrPath?.trim()),
    staleTime: 45 * 60 * 1000,
  });
}
