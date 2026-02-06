import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface EnsureProfileResult {
  success: boolean;
  action?: 'created' | 'updated' | 'no_action';
  full_name?: string;
  error?: string;
}

/**
 * Hook pour s'assurer que le profil utilisateur existe et est correct
 * S'exécute automatiquement au chargement si le profil nécessite une correction
 */
export function useEnsureProfile(user: User | null) {
  const ensureProfile = useCallback(async (): Promise<EnsureProfileResult | null> => {
    if (!user) {
      return null;
    }

    try {
      // Vérifier d'abord si le profil existe et a un full_name
      const { data: existingProfile, error: checkError } = await supabase
        .from('profils')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      // Si le profil n'existe pas ou n'a pas de full_name, corriger
      if (checkError || !existingProfile || !existingProfile.full_name) {
        console.log('🔧 Correction automatique du profil utilisateur...');
        
        const { data, error } = await supabase.rpc('assurer_profil_utilisateur');

        if (error) {
          console.error('❌ Erreur lors de la correction du profil:', error);
          return {
            success: false,
            error: error.message,
          };
        }

        if (data?.success) {
          console.log('✅ Profil corrigé automatiquement:', data);
          return {
            success: true,
            action: data.action as 'created' | 'updated',
            full_name: data.full_name,
          };
        }
      } else {
        // Le profil est déjà correct
        return {
          success: true,
          action: 'no_action',
          full_name: existingProfile.full_name,
        };
      }
    } catch (error: any) {
      console.error('❌ Erreur dans useEnsureProfile:', error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue',
      };
    }

    return null;
  }, [user]);

  // Exécuter automatiquement au montage si l'utilisateur est connecté
  useEffect(() => {
    if (user) {
      ensureProfile();
    }
  }, [user, ensureProfile]);

  return { ensureProfile };
}
