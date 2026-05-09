import { RetentionAnalyticsRepository } from "@/repositories/retention-analytics.repository";
import type { RetentionAnalyticsBundle } from "@/types/retention-analytics";

export class RetentionAnalyticsService {
  constructor(private readonly repository = new RetentionAnalyticsRepository()) {}

  /** Charge KPIs, cohortes, DAU et funnel en parallèle. */
  async loadAll(orgId: string): Promise<RetentionAnalyticsBundle> {
    const [kpis, cohorts, dau, funnel] = await Promise.all([
      this.repository.getKpis(orgId),
      this.repository.getCohorts(orgId, 12),
      this.repository.getDau(orgId),
      this.repository.getFunnel(orgId),
    ]);

    if (!kpis) {
      throw new Error("Aucune donnée de rétention pour cette organisation.");
    }

    return { kpis, cohorts, dau, funnel };
  }
}
