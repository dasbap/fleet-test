import { describe, expect, it } from "vitest";
import { planValueMessages } from "./plan-value-messages";

describe("planValueMessages", () => {
  it("expose des titres orientés résultat (pas une simple liste d’outils)", () => {
    expect(planValueMessages.reports.title.toLowerCase()).not.toMatch(/^rapport/);
    expect(planValueMessages.driverScoring.title.length).toBeGreaterThan(10);
    expect(planValueMessages.anomalyInsights.description).toContain("analyse");
  });
});
