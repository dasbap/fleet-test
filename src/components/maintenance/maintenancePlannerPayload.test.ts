import { describe, expect, it } from "vitest";

import {
  buildPlannerNotes,
  checklistToParts,
  computePlannedAtIso,
  mapUiPriorityToDb,
} from "./maintenancePlannerPayload";

describe("mapUiPriorityToDb", () => {
  it("maps normal to medium", () => {
    expect(mapUiPriorityToDb("normal")).toBe("medium");
  });

  it("preserves low, high, critical", () => {
    expect(mapUiPriorityToDb("low")).toBe("low");
    expect(mapUiPriorityToDb("high")).toBe("high");
    expect(mapUiPriorityToDb("critical")).toBe("critical");
  });
});

describe("buildPlannerNotes", () => {
  it("aggregates header, duration, provider and user notes", () => {
    const text = buildPlannerNotes({
      typeKey: "oil",
      userNotes: "Check joint",
      durationLabel: "2 heures",
      prestataireName: "Garage Test",
    });
    expect(text).toContain("[Type: Vidange huile]");
    expect(text).toContain("Durée estimée : 2 heures");
    expect(text).toContain("Prestataire choisi : Garage Test");
    expect(text).toContain("Notes : Check joint");
  });

  it("omits notes line when user text is blank", () => {
    const text = buildPlannerNotes({
      typeKey: "other",
      userNotes: "   ",
      durationLabel: "4 heures",
      prestataireName: null,
    });
    expect(text).not.toContain("Notes :");
  });
});

describe("checklistToParts", () => {
  it("keeps only checked rows", () => {
    const parts = checklistToParts([
      { label: "A", priceXaf: 1000, checked: true },
      { label: "B", priceXaf: 2000, checked: false },
    ]);
    expect(parts).toHaveLength(1);
    expect(parts[0].quantity).toBe(1);
    expect(parts[0].designation).toContain("A");
    expect(parts[0].designation).toContain("(estim.)");
  });
});

describe("computePlannedAtIso", () => {
  it("combines local date and time", () => {
    const d = new Date(2026, 3, 15);
    const iso = computePlannedAtIso(d, "14:30");
    const back = new Date(iso);
    expect(back.getFullYear()).toBe(2026);
    expect(back.getMonth()).toBe(3);
    expect(back.getDate()).toBe(15);
    expect(back.getHours()).toBe(14);
    expect(back.getMinutes()).toBe(30);
  });
});
