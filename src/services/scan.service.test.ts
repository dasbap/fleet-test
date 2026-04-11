import { describe, expect, it } from "vitest";
import { ScanService, tryExtractVehicleIdFromPublicEsambaUrl } from "@/services/scan.service";
import type { ScanRepository } from "@/repositories/scan.repository";

function createService(): ScanService {
  return new ScanService({} as ScanRepository);
}

describe("tryExtractVehicleIdFromPublicEsambaUrl", () => {
  it("extrait l'id depuis une URL https avec www", () => {
    expect(
      tryExtractVehicleIdFromPublicEsambaUrl("https://www.e-samba.com/vehicule/abc-uuid-001"),
    ).toBe("abc-uuid-001");
  });

  it("extrait l'id sans www", () => {
    expect(tryExtractVehicleIdFromPublicEsambaUrl("https://e-samba.com/vehicule/veh-99")).toBe(
      "veh-99",
    );
  });

  it("ignore la query string après l'id", () => {
    expect(
      tryExtractVehicleIdFromPublicEsambaUrl(
        "https://www.e-samba.com/vehicule/abc-123?utm_source=qr",
      ),
    ).toBe("abc-123");
  });

  it("accepte une URL sans schéma (préfixe https implicite)", () => {
    expect(tryExtractVehicleIdFromPublicEsambaUrl("e-samba.com/vehicule/manual-host")).toBe(
      "manual-host",
    );
  });

  it("refuse un autre domaine", () => {
    expect(
      tryExtractVehicleIdFromPublicEsambaUrl("https://evil.example/vehicule/x"),
    ).toBeNull();
  });

  it("refuse e-samba sans segment vehicule", () => {
    expect(tryExtractVehicleIdFromPublicEsambaUrl("https://www.e-samba.com/dashboard")).toBeNull();
  });

  it("refuse un segment vehicule vide", () => {
    expect(tryExtractVehicleIdFromPublicEsambaUrl("https://e-samba.com/vehicule/")).toBeNull();
  });
});

describe("ScanService.parseRawScan", () => {
  const service = createService();

  it("retourne vehicleId pour une URL publique e-samba vehicule", () => {
    expect(service.parseRawScan("https://www.e-samba.com/vehicule/v-1")).toEqual({
      kind: "vehicle",
      vehicleId: "v-1",
    });
  });

  it("conserve le comportement esamba://vehicle/", () => {
    expect(service.parseRawScan("esamba://vehicle/v-2")).toEqual({
      kind: "vehicle",
      vehicleId: "v-2",
    });
  });

  it("rejette une chaîne vide", () => {
    expect(() => service.parseRawScan("   ")).toThrow("Le code scanné est vide.");
  });
});
