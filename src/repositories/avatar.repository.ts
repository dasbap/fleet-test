import { supabase } from '@/integrations/supabase/client';
import { getSignedStorageUrl, invalidateSignedStorageUrl } from '@/lib/storage/signedUrl';

const BUCKET = 'avatars';

export class AvatarRepository {
  async upload(path: string, file: File, upsert: boolean = true): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert });
    if (error) throw error;
    invalidateSignedStorageUrl(BUCKET, path);
  }

  async getSignedUrl(path: string): Promise<string | null> {
    return getSignedStorageUrl(BUCKET, path);
  }

  async remove(paths: string[]): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) throw error;
    paths.forEach((p) => invalidateSignedStorageUrl(BUCKET, p));
  }

  /** Persiste le chemin storage (pas l'URL publique) dans les métadonnées auth. */
  async updateUserAvatarPath(storagePath: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      data: { avatar_path: storagePath, avatar_url: storagePath },
    });
    if (error) throw error;
  }
}
