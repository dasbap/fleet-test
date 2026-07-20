import { describe, expect, it } from "vitest";
import { asSingleRelation } from "@/lib/supabaseRelation";

describe("asSingleRelation", () => {
  it("retourne null pour null/undefined", () => {
    expect(asSingleRelation(null)).toBeNull();
    expect(asSingleRelation(undefined)).toBeNull();
  });

  it("retourne l'objet tel quel", () => {
    const row = { id: "1" };
    expect(asSingleRelation(row)).toBe(row);
  });

  it("prend le premier élément d'un tableau", () => {
    expect(asSingleRelation([{ id: "a" }, { id: "b" }])).toEqual({ id: "a" });
    expect(asSingleRelation([])).toBeNull();
  });
});
