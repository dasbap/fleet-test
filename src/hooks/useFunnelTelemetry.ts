import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { FunnelTelemetryRepository } from "@/repositories/funnel-telemetry.repository";
import { FunnelTelemetryService } from "@/services/funnel-telemetry.service";
import type { FunnelEventInput } from "@/types/funnel-telemetry";

const funnelTelemetryRepository = new FunnelTelemetryRepository();
const funnelTelemetryService = new FunnelTelemetryService(funnelTelemetryRepository);

export function useTrackFunnelEvent(orgId?: string) {
  const { mutate, mutateAsync, ...mutation } = useMutation({
    mutationFn: async (input: FunnelEventInput) => {
      if (!orgId) return;
      await funnelTelemetryService.trackEvent(orgId, input);
    },
  });

  const trackEvent = useCallback(
    (input: FunnelEventInput) => mutate(input),
    [mutate],
  );

  const trackEventAsync = useCallback(
    (input: FunnelEventInput) => mutateAsync(input),
    [mutateAsync],
  );

  return {
    ...mutation,
    trackEvent,
    trackEventAsync,
  };
}

export function useFunnelMetrics(orgId?: string, windowDays = 30) {
  return useQuery({
    queryKey: ["funnel-metrics", orgId, windowDays],
    queryFn: async () => {
      if (!orgId) return null;
      return funnelTelemetryService.getMetrics(orgId, windowDays);
    },
    enabled: Boolean(orgId),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

