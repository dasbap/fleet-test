import { beforeEach, describe, expect, it, vi } from "vitest";
import { DriverScoreRepository } from "./driver-score.repository";
import { withConsoleSilenced } from "@/test/withConsoleSilenced";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (name: string, args: unknown) => rpcMock(name, args),
    from: (table: string) => fromMock(table),
  },
}));

function scoreQuery(result: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    in: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

describe("DriverScoreRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to direct score reads when get_top_driver_scores is missing", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find the function public.get_top_driver_scores(p_fleet_id, p_limit) in the schema cache",
      },
    });

    fromMock.mockReturnValueOnce(
      scoreQuery({
        data: [
          {
            id: "score-1",
            driver_user_id: "driver-1",
            fleet_id: "fleet-1",
            score_level: "green",
            financial_score: 92,
            score_total: 92,
            incidents_score: 95,
            closure_delay_score: 90,
            shift_discipline_score: 91,
            operational_stability_score: 92,
            model_version: "v1-hybrid",
            model_metadata: {},
            last_calculated_at: "2026-07-02T08:00:00.000Z",
            created_at: "2026-07-02T07:00:00.000Z",
            driver: { user_id: "driver-1", full_name: "Driver A" },
          },
        ],
        error: null,
      }),
    );

    await withConsoleSilenced(
      (_method, args) =>
        typeof args[0] === "string" &&
        (args[0] as string).startsWith("get_top_driver_scores RPC unavailable;"),
      async () => {
        const scores = await new DriverScoreRepository().findTopByFleet("fleet-1", 5);

        expect(scores).toHaveLength(1);
        expect(scores[0]?.driver?.full_name).toBe("Driver A");
        expect(scores[0]?.score_total).toBe(92);
      },
    );
  });

  it("falls back to legacy direct reads when full driver scores query cannot order by score_total", async () => {
    fromMock
      .mockReturnValueOnce(
        scoreQuery({
          data: null,
          error: {
            code: "42703",
            message: "column scores_conducteurs.score_total does not exist",
          },
        }),
      )
      .mockReturnValueOnce(
        scoreQuery({
          data: null,
          error: {
            code: "42703",
            message: "column scores_conducteurs.score_total does not exist",
          },
        }),
      )
      .mockReturnValueOnce(
        scoreQuery({
          data: [
            {
              id: "score-legacy",
              driver_user_id: "driver-legacy",
              fleet_id: "fleet-1",
              score_level: "orange",
              financial_score: 68,
              last_calculated_at: "2026-07-02T08:00:00.000Z",
              created_at: "2026-07-02T07:00:00.000Z",
            },
          ],
          error: null,
        }),
      )
      .mockReturnValueOnce(
        scoreQuery({
          data: [{ user_id: "driver-legacy", full_name: "Driver Legacy" }],
          error: null,
        }),
      );

    await withConsoleSilenced(
      (_method, args) =>
        typeof args[0] === "string" &&
        (args[0] as string).startsWith("Driver scores embed/v2 columns unavailable;"),
      async () => {
        const scores = await new DriverScoreRepository().findByFleet("fleet-1");

        expect(scores).toHaveLength(1);
        expect(scores[0]?.score_total).toBe(68);
        expect(scores[0]?.driver?.full_name).toBe("Driver Legacy");
      },
    );
  });
});
