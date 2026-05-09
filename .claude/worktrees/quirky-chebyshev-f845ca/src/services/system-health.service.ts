import { SystemHealthRepository } from '@/repositories/system-health.repository';
import type { HealthRpcResult } from '@/repositories/system-health.repository';
import { FleetMemberRepository } from '@/repositories/fleet-member.repository';

export interface SystemHealthStatus {
  usersWithoutMembership: number;
  orphanUsers: Array<{ user_id: string; email: string; created_at: string }>;
  lastChecked: Date | null;
  isHealthy: boolean;
}

export class SystemHealthService {
  constructor(
    private repository: SystemHealthRepository,
    private fleetMemberRepository: FleetMemberRepository
  ) {}

  async checkHealth(fleetId: string, currentUserId?: string, currentUserEmail?: string, currentUserCreatedAt?: string): Promise<SystemHealthStatus> {
    const { data, error } = await this.repository.checkHealthRpc(fleetId);

    if (error?.code === '42883') {
      return this.fallbackHealthCheck(currentUserId, currentUserEmail, currentUserCreatedAt);
    }
    if (error) throw error;

    if (data && (data as HealthRpcResult).ok === false) {
      const errMsg = (data as HealthRpcResult).error || 'Erreur inconnue';
      throw new Error(errMsg === 'permission_denied' ? 'Permission refusée' : errMsg);
    }

    return {
      usersWithoutMembership: (data as HealthRpcResult)?.orphan_count ?? 0,
      orphanUsers: Array.isArray((data as HealthRpcResult)?.orphan_users) ? (data as HealthRpcResult).orphan_users! : [],
      lastChecked: new Date(),
      isHealthy: ((data as HealthRpcResult)?.orphan_count ?? 0) === 0,
    };
  }

  /** Fallback sans RPC (vérification membership uniquement). */
  async getFallbackStatus(
    userId?: string,
    email?: string,
    created_at?: string
  ): Promise<SystemHealthStatus> {
    if (!userId) {
      return {
        usersWithoutMembership: 0,
        orphanUsers: [],
        lastChecked: new Date(),
        isHealthy: true,
      };
    }
    const members = await this.fleetMemberRepository.findAll({
      user_id: userId,
      is_active: true,
    });
    const isHealthy = members.length > 0;
    return {
      usersWithoutMembership: isHealthy ? 0 : 1,
      orphanUsers: isHealthy ? [] : [{ user_id: userId, email: email || 'N/A', created_at: created_at || new Date().toISOString() }],
      lastChecked: new Date(),
      isHealthy,
    };
  }

  private async fallbackHealthCheck(
    userId?: string,
    email?: string,
    created_at?: string
  ): Promise<SystemHealthStatus> {
    return this.getFallbackStatus(userId, email, created_at);
  }

  async repairOrphanUser(userId: string, fleetId: string): Promise<void> {
    const { error } = await this.repository.repairOrphanRpc(userId, fleetId);
    if (error?.code === '42883') {
      throw new Error('RPC repair_orphan_membership non déployée. Exécutez le SQL fourni.');
    }
    if (error) throw error;
  }
}
