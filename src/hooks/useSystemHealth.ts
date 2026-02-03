import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SystemHealthStatus {
  usersWithoutMembership: number;
  orphanUsers: { user_id: string; email: string; created_at: string }[];
  lastChecked: Date | null;
  isHealthy: boolean;
}

interface SystemHealthResult {
  status: SystemHealthStatus;
  isLoading: boolean;
  error: string | null;
  checkHealth: () => Promise<void>;
  repairOrphanUser: (userId: string, fleetId: string) => Promise<boolean>;
}

export function useSystemHealth(): SystemHealthResult {
  const { role, userFleetId } = useAuth();
  const [status, setStatus] = useState<SystemHealthStatus>({
    usersWithoutMembership: 0,
    orphanUsers: [],
    lastChecked: null,
    isHealthy: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only organizers and managers can check system health
  const canCheckHealth = role === 'organizer' || role === 'manager';

  const checkHealth = useCallback(async () => {
    if (!canCheckHealth || !userFleetId) {
      setError('Permission refusée ou flotte non définie');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the RPC to check system health
      const { data, error: rpcError } = await supabase.rpc('check_system_health', {
        p_fleet_id: userFleetId,
      });

      if (rpcError) {
        // If RPC doesn't exist, use fallback check
        if (rpcError.code === '42883') {
          console.warn('RPC check_system_health not found, using fallback');
          await fallbackHealthCheck();
          return;
        }
        throw rpcError;
      }

      setStatus({
        usersWithoutMembership: data?.orphan_count || 0,
        orphanUsers: data?.orphan_users || [],
        lastChecked: new Date(),
        isHealthy: (data?.orphan_count || 0) === 0,
      });
    } catch (err: any) {
      console.error('Health check error:', err);
      setError(err.message || 'Erreur lors de la vérification');
      // Try fallback
      await fallbackHealthCheck();
    } finally {
      setIsLoading(false);
    }
  }, [canCheckHealth, userFleetId]);

  const fallbackHealthCheck = async () => {
    // Fallback: check if current user has valid membership
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships, error: membershipError } = await supabase
        .from('fleet_memberships')
        .select('id, fleet_id, role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (membershipError) {
        setError(membershipError.message);
        return;
      }

      const isHealthy = memberships && memberships.length > 0;
      setStatus({
        usersWithoutMembership: isHealthy ? 0 : 1,
        orphanUsers: isHealthy ? [] : [{
          user_id: user.id,
          email: user.email || 'N/A',
          created_at: user.created_at || new Date().toISOString(),
        }],
        lastChecked: new Date(),
        isHealthy,
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const repairOrphanUser = useCallback(async (userId: string, fleetId: string): Promise<boolean> => {
    if (!canCheckHealth) {
      setError('Permission refusée');
      return false;
    }

    try {
      // Call the RPC to repair orphan membership
      const { error: rpcError } = await supabase.rpc('repair_orphan_membership', {
        p_user_id: userId,
        p_fleet_id: fleetId,
        p_role: 'driver',
      });

      if (rpcError) {
        // If RPC doesn't exist, inform user
        if (rpcError.code === '42883') {
          setError('RPC repair_orphan_membership non déployée. Exécutez le SQL fourni.');
          return false;
        }
        throw rpcError;
      }

      // Re-check health after repair
      await checkHealth();
      return true;
    } catch (err: any) {
      console.error('Repair error:', err);
      setError(err.message || 'Erreur lors de la réparation');
      return false;
    }
  }, [canCheckHealth, checkHealth]);

  // Auto-check on mount for authorized users
  useEffect(() => {
    if (canCheckHealth && userFleetId) {
      checkHealth();
    }
  }, [canCheckHealth, userFleetId]);

  return {
    status,
    isLoading,
    error,
    checkHealth,
    repairOrphanUser,
  };
}
