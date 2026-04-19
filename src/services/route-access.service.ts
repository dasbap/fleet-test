import { RouteAccessRepository } from '@/repositories/route-access.repository';

/** `tenant_bootstrap` : aucune adhésion flotte → création / `/start`. `onboarding` : wizard produit incomplet → `/onboarding`. `upgrade` : abonnement payant à renouveler (`lapsedPaid`). */
export type RouteAccessState =
  | 'loading'
  | 'unauth'
  | 'tenant_bootstrap'
  | 'onboarding'
  | 'upgrade'
  | 'ready';

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
