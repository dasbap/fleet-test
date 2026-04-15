import { TenantAccessRepository } from "@/repositories/tenant-access.repository";
import type { AppRole } from "@/types/auth";

export interface TenantContext {
  orgId: string;
  fleetId: string;
  fleetName: string | null;
  role: AppRole;
}

export class TenantAccessService {
  constructor(private repository: TenantAccessRepository) {}

  async resolveUserTenants(userId: string): Promise<TenantContext[]> {
    if (!userId?.trim()) {
      return [];
    }

    const memberships = await this.repository.getActiveMemberships(userId);
    return memberships
      .filter((membership) => Boolean(membership.flottes?.org_id))
      .map((membership) => ({
        orgId: membership.flottes!.org_id,
        fleetId: membership.fleet_id,
        fleetName: membership.flottes?.name ?? null,
        role: membership.role,
      }));
  }

  canManageFleet(role: AppRole | null): boolean {
    return role === "organizer" || role === "manager";
  }
}
