import { FunnelTelemetryRepository } from "@/repositories/funnel-telemetry.repository";
import type { FunnelEventInput, FunnelMetrics } from "@/types/funnel-telemetry";

const EMPTY_METRICS: FunnelMetrics = {
  windowDays: 30,
  onboardingStep1DropRate: 0,
  onboardingStep2DropRate: 0,
  onboardingStep3DropRate: 0,
  onboardingStep4DropRate: 0,
  oneClickAttemptCount: 0,
  oneClickSuccessCount: 0,
  oneClickSuccessRate: 0,
  avgTimeToValueSeconds: 0,
};

export class FunnelTelemetryService {
  constructor(private repository: FunnelTelemetryRepository) {}

  async trackEvent(orgId: string, input: FunnelEventInput): Promise<void> {
    if (!orgId) {
      throw new Error("L'identifiant d'organisation est requis.");
    }
    await this.repository.trackEvent(orgId, input);
  }

  async getMetrics(orgId: string, windowDays = 30): Promise<FunnelMetrics> {
    if (!orgId) {
      throw new Error("L'identifiant d'organisation est requis.");
    }

    const raw = await this.repository.getMetrics(orgId, windowDays);
    if (!raw) {
      return { ...EMPTY_METRICS, windowDays };
    }

    return {
      windowDays: raw.windowDays ?? windowDays,
      onboardingStep1DropRate: Number(raw.onboardingStep1DropRate ?? 0),
      onboardingStep2DropRate: Number(raw.onboardingStep2DropRate ?? 0),
      onboardingStep3DropRate: Number(raw.onboardingStep3DropRate ?? 0),
      onboardingStep4DropRate: Number(raw.onboardingStep4DropRate ?? 0),
      oneClickAttemptCount: Number(raw.oneClickAttemptCount ?? 0),
      oneClickSuccessCount: Number(raw.oneClickSuccessCount ?? 0),
      oneClickSuccessRate: Number(raw.oneClickSuccessRate ?? 0),
      avgTimeToValueSeconds: Number(raw.avgTimeToValueSeconds ?? 0),
    };
  }
}

