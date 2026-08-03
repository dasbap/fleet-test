import { useEffect, useState } from 'react';
import { isMockAuthEnabled } from '@/lib/authMode';
import type { AuthUser } from '@/types/auth';
import { ProfileService } from '@/services/profile.service';
import { ProfileRepository } from '@/repositories/profile.repository';
import type { ProfileReadyStatus } from '@/services/profile.service';

const profileRepository = new ProfileRepository();
const profileService = new ProfileService(profileRepository);
const readyProfileCache = new Set<string>();

export type WaitForProfileStatus = 'idle' | 'pending' | ProfileReadyStatus;

/**
 * Attend que le profil DB soit prêt après connexion/inscription (poll profil_est_pret).
 */
export function useWaitForProfileReady(user: AuthUser | null) {
  const userId = user?.id ?? null;
  const [status, setStatus] = useState<WaitForProfileStatus>(() =>
    userId && readyProfileCache.has(userId) ? 'ready' : 'idle',
  );

  useEffect(() => {
    if (!userId) {
      setStatus('idle');
      return;
    }

    if (readyProfileCache.has(userId)) {
      setStatus('ready');
      return;
    }

    if (isMockAuthEnabled()) {
      readyProfileCache.add(userId);
      setStatus('ready');
      return;
    }

    let cancelled = false;
    setStatus('pending');

    profileService.waitUntilProfileReady(userId).then((result) => {
      if (!cancelled) {
        if (result === 'ready') {
          readyProfileCache.add(userId);
        }
        setStatus(result);
      }
    }).catch((error: unknown) => {
      console.error('Erreur lors de l’attente du profil :', error);
      if (!cancelled) {
        setStatus('timeout');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    status,
    isPending: status === 'pending',
    isReady: status === 'ready' || status === 'timeout',
    timedOut: status === 'timeout',
  };
}
