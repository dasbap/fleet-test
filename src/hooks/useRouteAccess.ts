import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  RouteAccessService,
  type RouteAccessResult,
} from '@/services/route-access.service';
import { RouteAccessRepository } from '@/repositories/route-access.repository';

const routeAccessRepository = new RouteAccessRepository();
const routeAccessService = new RouteAccessService(routeAccessRepository);

export function useRouteAccess(): RouteAccessResult {
  const { user, orgId, isLoading } = useAuth();

  const accessQuery = useQuery({
    queryKey: ['route-access', user?.id, orgId],
    queryFn: () => routeAccessService.getAccessForOrg(orgId as string),
    enabled: Boolean(user?.id && orgId),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return { state: 'loading', orgId: null };
  }

  if (!user?.id || !orgId) {
    return { state: 'unauth', orgId: null };
  }

  if (accessQuery.isLoading) {
    return { state: 'loading', orgId };
  }

  if (accessQuery.error) {
    return { state: 'onboarding', orgId };
  }

  return accessQuery.data ?? { state: 'onboarding', orgId };
}
