import { supabase } from "@/integrations/supabase/client";

export interface FailurePredictionRpcRow {
  vehicle_id: string;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  top_signals: unknown;
  recommended_actions: unknown;
}

export class FailurePredictionRepository {
  async predictFailureRisk(fleetId: string, vehicleId?: string): Promise<FailurePredictionRpcRow[]> {
    const { data, error } = await supabase.rpc("predict_failure_risk", {
      p_fleet_id: fleetId,
      p_vehicle_id: vehicleId ?? null,
    });

    if (error) {
      console.error("Error predicting failure risk:", error);
      throw new Error(error.message);
    }

    return (data ?? []) as FailurePredictionRpcRow[];
  }
}
