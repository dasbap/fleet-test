import { describe, it, expect } from "vitest";
import { getDefaultDriverChecklists } from "@/features/operations/mocks/operationsMock";
import {
  applyLocalChecklistOverrides,
  mergeServerChecklistProgress,
  toggleLocalItem,
  buildChecklistStorageKey,
} from "@/services/driver-operations-checklist.service";

describe("driver-operations-checklist.service", () => {
  const defaults = getDefaultDriverChecklists();

  it("mergeServerChecklistProgress : pre_trip coche tous les items départ", () => {
    const merged = mergeServerChecklistProgress(defaults, { hasPreTripDvirToday: true });
    expect(merged.departureChecklist.items.every((i) => i.done)).toBe(true);
    expect(merged.arrivalChecklist.items.every((i) => !i.done)).toBe(true);
  });

  it("mergeServerChecklistProgress : post_trip coche a1 et a2", () => {
    const merged = mergeServerChecklistProgress(defaults, { hasPostTripDvirToday: true });
    expect(merged.arrivalChecklist.items.find((i) => i.id === "a1")?.done).toBe(true);
    expect(merged.arrivalChecklist.items.find((i) => i.id === "a2")?.done).toBe(true);
    expect(merged.arrivalChecklist.items.find((i) => i.id === "a3")?.done).toBe(false);
  });

  it("mergeServerChecklistProgress : clôture km coche a3", () => {
    const merged = mergeServerChecklistProgress(defaults, { hasClosureWithKm: true });
    expect(merged.arrivalChecklist.items.find((i) => i.id === "a3")?.done).toBe(true);
  });

  it("applyLocalChecklistOverrides : fusionne serveur et local (OR)", () => {
    const server = mergeServerChecklistProgress(defaults, { hasPreTripDvirToday: true });
    const withLocal = applyLocalChecklistOverrides(server, {
      departure: { d1: false },
      arrival: { a3: true },
    });
    expect(withLocal.departureChecklist.items.find((i) => i.id === "d1")?.done).toBe(true);
    expect(withLocal.arrivalChecklist.items.find((i) => i.id === "a3")?.done).toBe(true);
  });

  it("toggleLocalItem inverse la valeur locale", () => {
    expect(toggleLocalItem({}, "d1")).toEqual({ d1: true });
    expect(toggleLocalItem({ d1: true }, "d1")).toEqual({ d1: false });
  });

  it("buildChecklistStorageKey inclut userId et créneau", () => {
    expect(buildChecklistStorageKey("user-1", "shift-1")).toBe("esamba:ops-checklist:user-1:shift-1");
    expect(buildChecklistStorageKey("user-1", null)).toBe("esamba:ops-checklist:user-1:sans-creneau");
  });
});
