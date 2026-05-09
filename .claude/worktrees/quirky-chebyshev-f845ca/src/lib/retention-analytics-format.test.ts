import { describe, expect, it } from "vitest";
import {
  formatRetentionDate,
  retentionHeatClass,
  retentionPct,
} from "@/lib/retention-analytics-format";

describe("retentionPct", () => {
  it("retourne 0 si le dénominateur est 0", () => {
    expect(retentionPct(5, 0)).toBe(0);
  });

  it("arrondit le pourcentage", () => {
    expect(retentionPct(1, 3)).toBe(33);
    expect(retentionPct(2, 3)).toBe(67);
  });
});

describe("retentionHeatClass", () => {
  it("applique les seuils de couleur", () => {
    expect(retentionHeatClass(0)).toContain("surface-raised");
    expect(retentionHeatClass(10)).toContain("amber");
    expect(retentionHeatClass(25)).toContain("brand");
    expect(retentionHeatClass(50)).toContain("font-medium");
  });
});

describe("formatRetentionDate", () => {
  it("formate une date ISO en fr-FR", () => {
    const s = formatRetentionDate("2026-04-12T00:00:00.000Z");
    expect(s.length).toBeGreaterThan(3);
    expect(s).toMatch(/2026/);
  });
});
