import { AuditRepository, type AuditLogRow } from '@/repositories/audit.repository';
import { requirePermission } from '@/lib/rbac/server';

/** Actions membres affichées dans le hub rôles. */
export const FLEET_MEMBER_AUDIT_ACTIONS = [
  'member.added',
  'member.role_changed',
  'member.deactivated',
  'member.reactivated',
  'member.updated',
  'member.offboarded',
  'member.invited',
  'vehicle.created',
  'vehicle.deleted',
  'closure.validated',
  'maintenance.validated',
  'org.settings_changed',
] as const;

/**
 * Service — historique d'audit flotte.
 */
export class AuditService {
  constructor(private repository: AuditRepository) {}

  async getFleetAuditLogs(fleetId: string, limit = 50): Promise<AuditLogRow[]> {
    if (!fleetId) {
      return [];
    }

    await requirePermission('member.view', fleetId);

    return this.repository.findByFleet(fleetId, {
      limit,
      actions: [...FLEET_MEMBER_AUDIT_ACTIONS],
    });
  }

  async recordAction(
    action: string,
    fleetId: string,
    metadata: Record<string, unknown> = {},
    targetId?: string,
  ): Promise<void> {
    if (!fleetId || !action) {
      throw new Error('Action et flotte requis pour l\'audit.');
    }

    await this.repository.write(action, fleetId, metadata, targetId);
  }
}
