import type { QueryClient } from "@tanstack/react-query";

const INVALIDATION_DEBOUNCE_MS = 180;

/**
 * Regroupe les invalidations KPI issues des rafales realtime pour limiter les re-renders.
 */
export class DashboardRealtimeInvalidationService {
  private readonly timers = new Map<string, number>();

  scheduleKpiRefresh(queryClient: QueryClient, orgId: string): void {
    const existing = this.timers.get(orgId);
    if (existing !== undefined) {
      window.clearTimeout(existing);
    }

    const timer = window.setTimeout(() => {
      this.timers.delete(orgId);
      void queryClient.invalidateQueries({ queryKey: ["dashboard-kpis", orgId] });
    }, INVALIDATION_DEBOUNCE_MS);

    this.timers.set(orgId, timer);
  }

  clear(orgId: string): void {
    const timer = this.timers.get(orgId);
    if (timer === undefined) return;
    window.clearTimeout(timer);
    this.timers.delete(orgId);
  }
}

export const dashboardRealtimeInvalidationService = new DashboardRealtimeInvalidationService();
