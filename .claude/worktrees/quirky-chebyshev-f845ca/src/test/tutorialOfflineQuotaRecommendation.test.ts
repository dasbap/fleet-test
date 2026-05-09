import { describe, expect, it, vi } from "vitest";
import { recommendTutorialOfflineQuota } from "@/lib/tutorialOfflineQuotaRecommendation";

describe("recommendTutorialOfflineQuota", () => {
  it("recommande un quota entrée de gamme", () => {
    vi.stubGlobal("navigator", {
      deviceMemory: 2,
      hardwareConcurrency: 4,
    });

    const result = recommendTutorialOfflineQuota();
    expect(result.tier).toBe("entry");
    expect(result.recommendedQuotaMb).toBe(120);
  });

  it("recommande un quota haut de gamme", () => {
    vi.stubGlobal("navigator", {
      deviceMemory: 8,
      hardwareConcurrency: 8,
    });

    const result = recommendTutorialOfflineQuota();
    expect(result.tier).toBe("high");
    expect(result.recommendedQuotaMb).toBe(500);
  });

  it("recommande un quota milieu de gamme par défaut", () => {
    vi.stubGlobal("navigator", {
      deviceMemory: 4,
      hardwareConcurrency: 6,
    });

    const result = recommendTutorialOfflineQuota();
    expect(result.tier).toBe("mid");
    expect(result.recommendedQuotaMb).toBe(250);
  });
});
