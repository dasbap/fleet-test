import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { SystemHealthService } from '@/services/system-health.service';
import { SystemHealthRepository } from '@/repositories/system-health.repository';
import { FleetMemberRepository } from '@/repositories/fleet-member.repository';
import type { SystemHealthStatus } from '@/services/system-health.service';

const systemHealthRepository = new SystemHealthRepository();
const fleetMemberRepository = new FleetMemberRepository();
const systemHealthService = new SystemHealthService(systemHealthRepository, fleetMemberRepository);

interface SystemHealthResult {
  status: SystemHealthStatus;
  isLoading: boolean;
  error: string | null;
  checkHealth: () => Promise<void>;
  repairOrphanUser: (userId: string, fleetId: string) => Promise<boolean>;
}

export function useSystemHealth(): SystemHealthResult {
  const { role, userFleetId, user } = useAuth();
  const [status, setStatus] = useState<SystemHealthStatus>({
    usersWithoutMembership: 0,
    orphanUsers: [],
    lastChecked: null,
    isHealthy: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCheckHealth = role === 'organizer' || role === 'manager';

  const checkHealth = useCallback(async () => {
    if (!canCheckHealth || !userFleetId) {
      setError('Permission refusée ou flotte non définie');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await systemHealthService.checkHealth(
        userFleetId,
        user?.id,
        user?.email ?? undefined,
        user?.created_at
      );
      setStatus(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la vérification';
      console.error('Health check error:', err);
      setError(message);
      try {
        const fallback = await systemHealthService.getFallbackStatus(
          user?.id,
          user?.email ?? undefined,
          user?.created_at
        );
        setStatus(fallback);
      } catch {
        // garder setError ci-dessus
      }
    } finally {
      setIsLoading(false);
    }
  }, [canCheckHealth, userFleetId, user?.id, user?.email, user?.created_at]);

  const repairOrphanUser = useCallback(
    async (userId: string, fleetId: string): Promise<boolean> => {
      if (!canCheckHealth) {
        setError('Permission refusée');
        return false;
      }
      try {
        await systemHealthService.repairOrphanUser(userId, fleetId);
        await checkHealth();
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur lors de la réparation';
        console.error('Repair error:', err);
        setError(message);
        return false;
      }
    },
    [canCheckHealth, checkHealth]
  );

  useEffect(() => {
    if (canCheckHealth && userFleetId) {
      checkHealth();
    }
  }, [canCheckHealth, userFleetId, checkHealth]);

  return {
    status,
    isLoading,
    error,
    checkHealth,
    repairOrphanUser,
  };
}
