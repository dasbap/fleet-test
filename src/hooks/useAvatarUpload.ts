import { useCallback, useState } from 'react';
import type { AuthUser } from '@/types/auth';
import { toast } from '@/hooks/use-toast';
import { mapSupabaseErrorToFrench } from '@/lib/mapSupabaseError';
import { AvatarService } from '@/services/avatar.service';
import { AvatarRepository } from '@/repositories/avatar.repository';

const avatarRepository = new AvatarRepository();
const avatarService = new AvatarService(avatarRepository);

interface UseAvatarUploadOptions {
  onAvatarUpdated?: (url: string) => void;
}

/**
 * Hook pour gérer l'upload de l'avatar utilisateur (délègue au service).
 */
export function useAvatarUpload(user: AuthUser, options?: UseAvatarUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const onAvatarUpdated = options?.onAvatarUpdated;

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!file) return;

      setIsUploading(true);
      try {
        const newAvatarUrl = await avatarService.uploadAvatar(user.id, file);
        onAvatarUpdated?.(newAvatarUrl);
        toast({
          title: 'Succès',
          description: 'Votre photo de profil a été mise à jour',
        });
      } catch (error: unknown) {
        console.error("Erreur lors de l'upload avatar :", error);
        const rawMessage = error instanceof Error ? error.message : undefined;
        const description = rawMessage
          ? mapSupabaseErrorToFrench(rawMessage)
          : "Impossible de télécharger l'image";
        toast({
          title: 'Erreur',
          description,
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [onAvatarUpdated, user.id]
  );

  return { isUploading, uploadAvatar };
}
