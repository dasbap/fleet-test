import { describe, expect, it } from "vitest";
import {
  compactVehicleRegistration,
  getVehicleRegistrationRule,
  normalizeVehicleRegistration,
  validateVehicleRegistrationForCountry,
} from "@/domain/vehicleRegistration";

describe("vehicle registration rules", () => {
  it("normalise les plaques avant comparaison", () => {
    expect(normalizeVehicleRegistration(" lt-1234 a ")).toBe("LT-1234 A");
    expect(compactVehicleRegistration("LT 1234-A")).toBe("LT1234A");
  });

  it("applique les limites camerounaises", () => {
    const rule = getVehicleRegistrationRule("CM");
    expect(rule.placeholder).toBe("LT 1234 A");
    expect(validateVehicleRegistrationForCountry("LT 1234 A", "CM")).toBeNull();
    expect(validateVehicleRegistrationForCountry("A1", "CM")).toContain("entre 6 et 9");
  });

  it("change les contraintes selon le pays", () => {
    expect(getVehicleRegistrationRule("CF").maxCompactLength).toBe(10);
    expect(getVehicleRegistrationRule("TD").placeholder).toBe("AB 1234");
    expect(getVehicleRegistrationRule("GA").placeholder).toBe("1234 G1");
  });

  it("rejette les caracteres non autorises", () => {
    expect(validateVehicleRegistrationForCountry("LT@1234", "CM")).toContain(
      "lettres, chiffres",
    );
  });
});
