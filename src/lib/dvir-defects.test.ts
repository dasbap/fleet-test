import { describe, expect, it } from "vitest";
import { countDvirDefectsFromJsonbItems } from "./dvir-defects";

describe("countDvirDefectsFromJsonbItems", () => {
  it("renvoie 0 pour null / non-objet", () => {
    expect(countDvirDefectsFromJsonbItems(null)).toBe(0);
    expect(countDvirDefectsFromJsonbItems([])).toBe(0);
    expect(countDvirDefectsFromJsonbItems("x")).toBe(0);
  });

  it("compte defaut / defect (casse insensible)", () => {
    expect(
      countDvirDefectsFromJsonbItems({
        a: { status: "defaut" },
        b: { status: "DEFECT" },
        c: { status: "ok" },
      }),
    ).toBe(2);
  });

  it("compte la valeur false (legacy jsonb)", () => {
    expect(
      countDvirDefectsFromJsonbItems({
        a: { status: "ok" },
        b: false,
      }),
    ).toBe(1);
  });
});
