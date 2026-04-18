import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { isMockAuthEnabled } from '@/lib/authMode';
import {
  RouteAccessService,
  type RouteAccessResult,
} from '@/services/route-access.service';
import { RouteAccessRepository } from '@/repositories/route-access.repository';

const routeAccessRepository = new RouteAccessRepository();
const routeAccessService = new RouteAccessService(routeAccessRepository);

export function useRouteAccess(): RouteAccessResult {
  const { user, orgId, memberships, activeTenantContext, isLoading } = useAuth();

  const accessQuery = useQuery({
    queryKey: ["route-access", user?.id, orgId, activeTenantContext?.fleetId],
    queryFn: () => routeAccessService.getAccessForOrg(orgId as string),
    enabled: Boolean(user?.id && orgId && activeTenantContext?.fleetId),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return { state: 'loading', orgId: null };
  }

  /** Session mockée : pas d’organisation Supabase ; le dashboard reste utilisable (démo / E2E). */
  if (isMockAuthEnabled() && user?.id) {
    return { state: 'ready', orgId: null };
  }

  if (!user?.id) {
    return { state: 'unauth', orgId: null };
  }

  if (memberships.length === 0) {
    return { state: "onboarding", orgId: null };
  }

  if (!orgId || !activeTenantContext?.fleetId) {
    return { state: "loading", orgId: null };
  }

  if (accessQuery.isLoading) {
    return { state: 'loading', orgId };
  }

  if (accessQuery.error) {
    return { state: 'onboarding', orgId };
  }

  return accessQuery.data ?? { state: 'onboarding', orgId };
}
