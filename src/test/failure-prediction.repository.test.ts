import { beforeEach, describe, expect, it, vi } from "vitest";
import { FailurePredictionRepository } from "@/repositories/failure-prediction.repository";

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

describe("FailurePredictionRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("appelle la RPC predict_failure_risk avec les paramètres attendus", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          vehicle_id: "veh-1",
          risk_score: 72,
          risk_level: "high",
          top_signals: ["Signal"],
          recommended_actions: ["Action"],
        },
      ],
      error: null,
    });

    const repository = new FailurePredictionRepository();
    const rows = await repository.predictFailureRisk("fleet-1", "veh-1");

    expect(mockRpc).toHaveBeenCalledWith("predict_failure_risk", {
      p_fleet_id: "fleet-1",
      p_vehicle_id: "veh-1",
    });
    expect(rows).toHaveLength(1);
  });
});
