import { describe, expect, it } from "vitest";
import { isValidUuid } from "./isUuid";

describe("isValidUuid", () => {
  it("accepte un UUID v4 bien formé", () => {
    expect(isValidUuid("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
  });

  it("refuse un slug ou texte non UUID", () => {
    expect(isValidUuid("fleet-esamba-sn")).toBe(false);
    expect(isValidUuid("")).toBe(false);
    expect(isValidUuid(null)).toBe(false);
  });
});
