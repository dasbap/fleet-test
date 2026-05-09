import { describe, expect, it } from "vitest";
import { ScanService, tryExtractVehicleIdFromPublicEsambaUrl } from "@/services/scan.service";
import type { ScanRepository } from "@/repositories/scan.repository";

function createService(): ScanService {
  return new ScanService({} as ScanRepository);
}

describe("tryExtractVehicleIdFromPublicEsambaUrl", () => {
  const uuidV4 = "c56a4180-65aa-42ec-a945-5fd21dec0538";

  it("extrait l'id depuis une URL https avec www", () => {
    expect(
      tryExtractVehicleIdFromPublicEsambaUrl(`https://www.e-samba.com/vehicule/${uuidV4}`),
    ).toBe(uuidV4);
  });

  it("extrait l'id sans www", () => {
    expect(tryExtractVehicleIdFromPublicEsambaUrl(`https://e-samba.com/vehicule/${uuidV4}`)).toBe(
      uuidV4,
    );
  });

  it("ignore la query string après l'id", () => {
    expect(
      tryExtractVehicleIdFromPublicEsambaUrl(
        "https://www.e-samba.com/vehicule/abc-123?utm_source=qr",
      ),
    ).toBeNull();
  });

  it("accepte une URL sans schéma (préfixe https implicite)", () => {
    expect(tryExtractVehicleIdFromPublicEsambaUrl(`e-samba.com/vehicule/${uuidV4}`)).toBe(
      uuidV4,
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
  const uuidV4 = "c56a4180-65aa-42ec-a945-5fd21dec0538";

  it("retourne vehicleId pour une URL publique e-samba vehicule", () => {
    expect(service.parseRawScan(`https://www.e-samba.com/vehicule/${uuidV4}`)).toEqual({
      kind: "vehicle",
      vehicleId: uuidV4,
    });
  });

  it("accepte le format terrain esamba://vehicule/{uuid-v4}", () => {
    expect(service.parseRawScan(`esamba://vehicule/${uuidV4}`)).toEqual({
      kind: "vehicle",
      vehicleId: uuidV4,
    });
  });

  it("rejette le format terrain avec un identifiant non uuid", () => {
    expect(() => service.parseRawScan("esamba://vehicule/not-a-uuid")).toThrow(
      "Le QR véhicule est invalide. Format attendu: esamba://vehicule/{uuid-v4}.",
    );
  });

  it("garde la compatibilité avec esamba://vehicle/", () => {
    expect(service.parseRawScan("esamba://vehicle/v-2")).toEqual({
      kind: "vehicle",
      vehicleId: "v-2",
    });
  });

  it("rejette un deep link legacy vide", () => {
    expect(() => service.parseRawScan("esamba://vehicle/")).toThrow(
      "Le QR véhicule ne contient pas d'identifiant valide.",
    );
  });

  it("accepte VEH: pour la recherche par immatriculation", () => {
    expect(service.parseRawScan("VEH:ab-123-cd")).toEqual({
      kind: "vehicle",
      registration: "AB-123-CD",
    });
  });

  it("rejette une chaîne vide", () => {
    expect(() => service.parseRawScan("   ")).toThrow("Le code scanné est vide.");
  });
});

describe("ScanService.resolveScan", () => {
  const fleetId = "fleet-1";
  const uuidV4 = "c56a4180-65aa-42ec-a945-5fd21dec0538";

  it("résout un véhicule par id avec fallback repository", async () => {
    const repository = {
      findVehicleById: async (vehicleId: string, requestedFleetId: string) => ({
        id: vehicleId,
        fleet_id: requestedFleetId,
        registration: "AB-123-CD",
      }),
      findVehicleByRegistration: async () => null,
    } as unknown as ScanRepository;
    const service = new ScanService(repository);

    await expect(service.resolveScan(`esamba://vehicule/${uuidV4}`, fleetId)).resolves.toEqual({
      kind: "vehicle",
      route: `/dashboard/vehicles/${uuidV4}`,
      label: "AB-123-CD",
    });
  });

  it("renvoie une erreur claire si véhicule absent", async () => {
    const repository = {
      findVehicleById: async () => null,
      findVehicleByRegistration: async () => null,
    } as unknown as ScanRepository;
    const service = new ScanService(repository);

    await expect(service.resolveScan(`esamba://vehicule/${uuidV4}`, fleetId)).rejects.toThrow(
      "Véhicule introuvable dans votre flotte.",
    );
  });
});
