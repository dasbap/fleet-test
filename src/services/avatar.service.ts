import { AvatarRepository } from '@/repositories/avatar.repository';
import { extractStorageObjectPath } from '@/lib/storage/signedUrl';

const BUCKET = 'avatars';
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 Mo

export class AvatarService {
  constructor(private repository: AvatarRepository) {}

  async uploadAvatar(userId: string, file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Veuillez sélectionner une image valide');
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      throw new Error("L'image ne doit pas dépasser 2 Mo");
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `avatar.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    await this.repository.upload(filePath, file, true);
    await this.repository.updateUserAvatarPath(filePath);

    const signedUrl = await this.repository.getSignedUrl(filePath);
    if (!signedUrl) throw new Error("URL introuvable après l'upload");

    return signedUrl;
  }

  /** Résout avatar_url / avatar_path (ancien format URL ou chemin storage). */
  async resolveAvatarDisplayUrl(
    avatarUrlOrPath: string | null | undefined,
  ): Promise<string | null> {
    if (!avatarUrlOrPath?.trim()) return null;
    const path = extractStorageObjectPath(BUCKET, avatarUrlOrPath);
    if (!path && avatarUrlOrPath.startsWith('http')) {
      return avatarUrlOrPath;
    }
    return this.repository.getSignedUrl(path || avatarUrlOrPath);
  }
}
