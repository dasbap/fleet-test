import { describe, expect, it } from "vitest";
import {
  extractDigits,
  isValidCameroonMobileInput,
  normalizeCameroonPhoneE164,
} from "./cameroonPhone";

describe("cameroonPhone", () => {
  it("valide un mobile 9 chiffres national", () => {
    expect(isValidCameroonMobileInput("699 000 111")).toBe(true);
    expect(isValidCameroonMobileInput("699000111")).toBe(true);
  });

  it("valide avec indicatif 237", () => {
    expect(isValidCameroonMobileInput("+237 699 000 111")).toBe(true);
    expect(isValidCameroonMobileInput("237699000111")).toBe(true);
  });

  it("rejette un numéro trop court ou invalide", () => {
    expect(isValidCameroonMobileInput("123")).toBe(false);
    expect(isValidCameroonMobileInput("799000111")).toBe(false);
  });

  it("normalise vers +237…", () => {
    expect(normalizeCameroonPhoneE164("699000222")).toBe("+237699000222");
    expect(normalizeCameroonPhoneE164("+237 699 000 333")).toBe("+237699000333");
  });

  it("extractDigits retire le non numérique", () => {
    expect(extractDigits(" +237 (699) 000-444 ")).toBe("237699000444");
  });
});
