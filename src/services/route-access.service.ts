import { RouteAccessRepository } from '@/repositories/route-access.repository';

export type RouteAccessState = 'loading' | 'unauth' | 'onboarding' | 'ready';

export interface RouteAccessResult {
  state: RouteAccessState;
  orgId: string | null;
}

export class RouteAccessService {
  constructor(private repository: RouteAccessRepository) {}

  async getAccessForOrg(orgId: string): Promise<RouteAccessResult> {
    if (!orgId?.trim()) {
      throw new Error("L'identifiant de l'organisation est requis.");
    }

    const completed = await this.repository.isOnboardingCompleted(orgId);
    return {
      state: completed ? 'ready' : 'onboarding',
      orgId,
    };
  }
}
