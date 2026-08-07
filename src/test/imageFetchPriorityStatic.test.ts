import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("image fetch priority attributes", () => {
  it("uses lowercase fetchpriority so React does not warn on img elements", () => {
    const heroSection = readFileSync("src/components/landing/HeroSection.tsx", "utf8");
    const optimizedImage = readFileSync("src/components/shared/OptimizedImage.tsx", "utf8");
    const imageSources = `${heroSection}\n${optimizedImage}`;

    expect(imageSources).not.toContain("fetchPriority=");
    expect(imageSources).toContain("fetchpriority");
  });
});
