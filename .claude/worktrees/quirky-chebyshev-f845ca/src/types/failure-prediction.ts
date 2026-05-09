export type FailureRiskLevel = "low" | "medium" | "high" | "critical";

export interface FailurePrediction {
  vehicleId: string;
  riskScore: number;
  riskLevel: FailureRiskLevel;
  topSignals: string[];
  recommendedActions: string[];
}
