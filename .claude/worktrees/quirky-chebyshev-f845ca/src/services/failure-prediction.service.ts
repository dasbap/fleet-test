import { FailurePredictionRepository, type FailurePredictionRpcRow } from "@/repositories/failure-prediction.repository";
import {
  sendWhatsappEdgeService,
  type SendWhatsappEdgeService,
} from "@/services/send-whatsapp-edge.service";
import type { FailurePrediction } from "@/types/failure-prediction";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

export class FailurePredictionService {
  constructor(
    private repository: FailurePredictionRepository,
    private whatsappService: SendWhatsappEdgeService = sendWhatsappEdgeService,
  ) {}

  async getFailureRiskPredictions(fleetId: string, vehicleId?: string): Promise<FailurePrediction[]> {
    if (!fleetId?.trim()) {
      throw new Error("ID de flotte requis");
    }

    if (vehicleId !== undefined && !vehicleId.trim()) {
      throw new Error("ID véhicule invalide");
    }

    const startedAt = Date.now();
    const rows = await this.repository.predictFailureRisk(fleetId.trim(), vehicleId?.trim() || undefined);
    const predictions = rows.map((row) => this.mapRow(row));

    const highOrCritical = predictions.filter(
      (prediction) => prediction.riskLevel === "high" || prediction.riskLevel === "critical",
    ).length;
    console.info("[FailurePrediction] monitoring", {
      prediction_latency_ms: Date.now() - startedAt,
      scored_vehicles_count: predictions.length,
      high_or_critical_count: highOrCritical,
      high_or_critical_rate: predictions.length > 0 ? highOrCritical / predictions.length : 0,
    });

    return predictions;
  }

  async sendHealthcheckMessageIfConfigured(
    fleetId: string,
    recipientPhone?: string,
  ): Promise<"sent" | "skipped"> {
    if (!fleetId?.trim() || !recipientPhone?.trim()) {
      return "skipped";
    }

    await this.whatsappService.send({
      fleetId: fleetId.trim(),
      recipientPhone: recipientPhone.trim(),
      templateName: "maintenance_alert_resolved_fr",
      languageCode: "fr",
      variables: ["Prédiction pannes: tout fonctionne."],
    });

    return "sent";
  }

  private mapRow(row: FailurePredictionRpcRow): FailurePrediction {
    return {
      vehicleId: row.vehicle_id,
      riskScore: Math.max(0, Math.min(100, Number(row.risk_score) || 0)),
      riskLevel: row.risk_level,
      topSignals: toStringArray(row.top_signals),
      recommendedActions: toStringArray(row.recommended_actions),
    };
  }
}
