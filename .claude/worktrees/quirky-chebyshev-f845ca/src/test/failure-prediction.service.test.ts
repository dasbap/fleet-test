import { describe, expect, it, vi } from "vitest";
import { FailurePredictionService } from "@/services/failure-prediction.service";
import type { FailurePredictionRepository } from "@/repositories/failure-prediction.repository";
import type { SendWhatsappEdgeService } from "@/services/send-whatsapp-edge.service";

describe("FailurePredictionService", () => {
  it("normalise la sortie de prédiction et borne le score", async () => {
    const repo = {
      predictFailureRisk: vi.fn().mockResolvedValue([
        {
          vehicle_id: "veh-1",
          risk_score: 120,
          risk_level: "critical",
          top_signals: ["  incident critique "],
          recommended_actions: [" Planifier maintenant "],
        },
      ]),
    } as unknown as FailurePredictionRepository;

    const wa = { send: vi.fn() } as unknown as SendWhatsappEdgeService;
    const service = new FailurePredictionService(repo, wa);

    const result = await service.getFailureRiskPredictions("fleet-1");
    expect(result[0]).toEqual({
      vehicleId: "veh-1",
      riskScore: 100,
      riskLevel: "critical",
      topSignals: ["incident critique"],
      recommendedActions: ["Planifier maintenant"],
    });
  });

  it("envoie le message de santé si le numéro est fourni", async () => {
    const repo = { predictFailureRisk: vi.fn() } as unknown as FailurePredictionRepository;
    const wa = { send: vi.fn().mockResolvedValue({ success: true }) } as unknown as SendWhatsappEdgeService;
    const service = new FailurePredictionService(repo, wa);

    const status = await service.sendHealthcheckMessageIfConfigured("fleet-1", " +237699000111 ");
    expect(status).toBe("sent");
    expect((wa.send as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.objectContaining({
        fleetId: "fleet-1",
        recipientPhone: "+237699000111",
      }),
    );
  });
});
