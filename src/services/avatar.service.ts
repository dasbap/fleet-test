import { AvatarRepository } from '@/repositories/avatar.repository';

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
    const publicUrl = this.repository.getPublicUrl(filePath);
    if (!publicUrl) throw new Error("URL introuvable après l'upload");

    await this.repository.updateUserAvatarUrl(publicUrl);
    return publicUrl;
  }
}
