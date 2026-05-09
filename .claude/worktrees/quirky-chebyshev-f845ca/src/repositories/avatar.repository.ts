import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'avatars';

export class AvatarRepository {
  async upload(path: string, file: File, upsert: boolean = true): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert });
    if (error) throw error;
  }

  getPublicUrl(path: string): string {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async remove(paths: string[]): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) throw error;
  }

  async updateUserAvatarUrl(avatarUrl: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl },
    });
    if (error) throw error;
  }
}
