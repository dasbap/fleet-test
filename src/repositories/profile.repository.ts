import { supabase } from '@/integrations/supabase/client';

export interface ProfileRow {
  user_id: string;
  full_name: string | null;
}

export interface EnsureProfileRpcResult {
  success?: boolean;
  action?: string;
  full_name?: string;
}

export class ProfileRepository {
  async findByUserId(userId: string): Promise<ProfileRow | null> {
    const { data, error } = await supabase
      .from('profils')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      throw new Error(error.message);
    }
    return data ? { user_id: userId, full_name: (data as { full_name: string | null }).full_name } : null;
  }

  async ensureProfileRpc(): Promise<EnsureProfileRpcResult | null> {
    const { data, error } = await supabase.rpc('assurer_profil_utilisateur');
    if (error) {
      console.error('Error ensuring profile:', error);
      throw new Error(error.message);
    }
    return data as EnsureProfileRpcResult | null;
  }

  async isProfileReadyRpc(): Promise<boolean> {
    const { data, error } = await supabase.rpc('profil_est_pret');
    if (error) {
      console.error('Error checking profile readiness:', error);
      throw new Error(error.message);
    }
    return Boolean(data);
  }

  async updateAuthFullName(fullName: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    if (error) {
      console.error('Error updating auth profile metadata:', error);
      throw new Error(error.message);
    }
  }

  async updateFullName(userId: string, fullName: string): Promise<void> {
    const { error } = await supabase
      .from('profils')
      .update({ full_name: fullName })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating profile row:', error);
      throw new Error(error.message);
    }
  }
}
