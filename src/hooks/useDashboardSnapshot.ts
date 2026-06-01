import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DashboardService } from "@/services/dashboard.service";
import { DashboardRepository } from "@/repositories/dashboard.repository";
import { queryKeys } from "@/lib/cache/queryKeys";
import { isMockAuthEnabled } from "@/lib/authMode";
import { canFetchDashboardKpis } from "@/lib/dashboard-kpis";
import { isValidUuid } from "@/lib/isUuid";
import {
  dashboardStaleTimeMs,
  refetchIntervalWhenVisible,
} from "@/lib/query/refetchPolicy";

const dashboardRepository = new DashboardRepository();
const dashboardService = new DashboardService(dashboardRepository);

/**
 * Snapshot agrégé dashboard (1 RPC) : stats, KPIs, résumé carburant.
 */
export function useDashboardSnapshot() {
  const { userFleetId, orgId } = useAuth();
  const skipRemote = isMockAuthEnabled();
  const canFetch =
    !!userFleetId &&
    !!orgId &&
    isValidUuid(orgId) &&
    canFetchDashboardKpis(orgId, skipRemote);

  return useQuery({
    queryKey: queryKeys.dashboard.snapshot(userFleetId ?? "", orgId ?? ""),
    queryFn: () => dashboardService.getDashboardSnapshot(userFleetId!, orgId!),
    enabled: canFetch,
    staleTime: dashboardStaleTimeMs(),
    refetchOnWindowFocus: true,
    refetchInterval: () => refetchIntervalWhenVisible(120_000, 300_000),
    retry: 1,
  });
}
