import { describe, expect, it, vi } from "vitest";
import { FunnelTelemetryService } from "@/services/funnel-telemetry.service";
import type { FunnelTelemetryRepository } from "@/repositories/funnel-telemetry.repository";

function createRepositoryMock() {
  return {
    trackEvent: vi.fn(),
    getMetrics: vi.fn(),
  };
}

describe("FunnelTelemetryService", () => {
  it("refuse un orgId vide lors du tracking", async () => {
    const repo = createRepositoryMock();
    const service = new FunnelTelemetryService(repo as unknown as FunnelTelemetryRepository);

    await expect(
      service.trackEvent("", {
        eventType: "onboarding_step_view",
        step: 1,
      }),
    ).rejects.toThrow("L'identifiant d'organisation est requis.");
  });

  it("normalise les métriques absentes avec des valeurs par défaut", async () => {
    const repo = createRepositoryMock();
    repo.getMetrics = vi.fn<() => Promise<null>>().mockResolvedValue(null);
    const service = new FunnelTelemetryService(repo as unknown as FunnelTelemetryRepository);

    const result = await service.getMetrics("org-1", 14);

    expect(result.windowDays).toBe(14);
    expect(result.oneClickSuccessRate).toBe(0);
    expect(result.avgTimeToValueSeconds).toBe(0);
  });
});

