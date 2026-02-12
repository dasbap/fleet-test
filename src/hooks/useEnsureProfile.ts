import { useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { ProfileService } from '@/services/profile.service';
import { ProfileRepository } from '@/repositories/profile.repository';
import type { EnsureProfileResult } from '@/services/profile.service';

const profileRepository = new ProfileRepository();
const profileService = new ProfileService(profileRepository);

/**
 * Hook pour s'assurer que le profil utilisateur existe (délègue au service).
 */
export function useEnsureProfile(user: User | null) {
  const ensureProfile = useCallback(async (): Promise<EnsureProfileResult | null> => {
    if (!user) return null;
    try {
      const result = await profileService.ensureProfile(user.id);
      if (result?.success && result.action !== 'no_action') {
        console.log('✅ Profil corrigé automatiquement:', result);
      }
      return result ?? null;
    } catch (err: unknown) {
      console.error('❌ Erreur dans useEnsureProfile:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      };
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      ensureProfile();
    }
  }, [user, ensureProfile]);

  return { ensureProfile };
}
