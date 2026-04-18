import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { RetentionAnalyticsService } from "@/services/retention-analytics.service";
import type { RetentionAnalyticsBundle } from "@/types/retention-analytics";

const retentionAnalyticsService = new RetentionAnalyticsService();

export function useRetentionAnalytics() {
  const { orgId } = useAuth();

  return useQuery<RetentionAnalyticsBundle, Error>({
    queryKey: ["retention-analytics", orgId],
    queryFn: () => {
      if (!orgId) {
        return Promise.reject(new Error("Organisation non disponible."));
      }
      return retentionAnalyticsService.loadAll(orgId);
    },
    enabled: !!orgId,
  });
}
