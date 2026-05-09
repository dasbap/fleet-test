import { describe, expect, it, vi } from "vitest";
import { WhatsappMonitoringService } from "@/services/whatsapp-monitoring.service";
import type { WhatsappMonitoringRepository } from "@/repositories/whatsapp-monitoring.repository";

function createRepositoryMock() {
  return {
    getStats: vi.fn(),
    getRecentFailures: vi.fn(),
  };
}

describe("WhatsappMonitoringService", () => {
  it("retourne des valeurs vides quand fleetId manquant", async () => {
    const repo = createRepositoryMock();
    const service = new WhatsappMonitoringService(repo as unknown as WhatsappMonitoringRepository);

    const result = await service.getMonitoringData("");

    expect(result.stats.total24h).toBe(0);
    expect(result.recentFailures).toEqual([]);
    expect(repo.getStats).not.toHaveBeenCalled();
  });

  it("agrège stats et incidents depuis le repository", async () => {
    const repo = createRepositoryMock();
    repo.getStats.mockResolvedValue({
      total24h: 10,
      failed24h: 2,
      retryScheduled: 1,
      successRate24h: 80,
    });
    repo.getRecentFailures.mockResolvedValue([
      {
        id: "1",
        createdAt: "2026-04-15T12:00:00Z",
        templateName: "maintenance_alert_assigned_fr",
        phoneE164: "+237612345678",
        errorMessage: "Erreur",
        retryCount: 1,
        maxRetries: 3,
        nextRetryAt: "2026-04-15T12:05:00Z",
      },
    ]);
    const service = new WhatsappMonitoringService(repo as unknown as WhatsappMonitoringRepository);

    const result = await service.getMonitoringData("fleet-1");

    expect(repo.getStats).toHaveBeenCalledWith("fleet-1");
    expect(repo.getRecentFailures).toHaveBeenCalledWith("fleet-1");
    expect(result.stats.failed24h).toBe(2);
    expect(result.recentFailures).toHaveLength(1);
  });
});
