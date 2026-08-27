import { beforeEach, describe, expect, it, vi } from "vitest";

const geoMock = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  getCurrentPosition: vi.fn(),
}));

const capacitorMock = vi.hoisted(() => ({
  getPlatform: vi.fn(),
}));

vi.mock("@capacitor/geolocation", () => ({ Geolocation: geoMock }));
vi.mock("@capacitor/core", () => ({ Capacitor: capacitorMock }));

import { GeolocationService } from "@/services/geolocation.service";

const STORAGE_KEY = "esamba_geo_last_position";

describe("GeolocationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    capacitorMock.getPlatform.mockReturnValue("android");
  });

  it("lit et persiste la dernière position", () => {
    const service = new GeolocationService();
    const snapshot = { latitude: 14.7, longitude: -17.4, accuracyMeters: 5, timestamp: 123 };

    expect(service.getLastKnownFromStorage()).toBeNull();
    service.persistLastKnown(snapshot);
    expect(service.getLastKnownFromStorage()).toEqual(snapshot);
  });

  it("ignore les données stockées invalides", () => {
    const service = new GeolocationService();

    sessionStorage.setItem(STORAGE_KEY, "{");
    expect(service.getLastKnownFromStorage()).toBeNull();

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ latitude: "14", longitude: -17.4, timestamp: 1 }));
    expect(service.getLastKnownFromStorage()).toBeNull();

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ latitude: 14, longitude: "-17", timestamp: 1 }));
    expect(service.getLastKnownFromStorage()).toBeNull();

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ latitude: 14, longitude: -17, timestamp: "1" }));
    expect(service.getLastKnownFromStorage()).toBeNull();
  });

  it("retourne la permission de localisation ou prompt en cas d'erreur", async () => {
    const service = new GeolocationService();

    geoMock.checkPermissions.mockResolvedValueOnce({ location: "granted" });
    await expect(service.checkLocationPermission()).resolves.toBe("granted");

    geoMock.checkPermissions.mockRejectedValueOnce(new Error("unsupported"));
    await expect(service.checkLocationPermission()).resolves.toBe("prompt");
  });

  it("sur web réutilise la vérification de permission", async () => {
    capacitorMock.getPlatform.mockReturnValue("web");
    geoMock.checkPermissions.mockResolvedValue({ location: "prompt" });
    const service = new GeolocationService();

    await expect(service.requestLocationPermission()).resolves.toBe("prompt");
    expect(geoMock.requestPermissions).not.toHaveBeenCalled();
  });

  it("sur natif demande la permission et renvoie denied en cas d'erreur", async () => {
    const service = new GeolocationService();

    geoMock.requestPermissions.mockResolvedValueOnce({ location: "limited" });
    await expect(service.requestLocationPermission()).resolves.toBe("limited");

    geoMock.requestPermissions.mockRejectedValueOnce(new Error("native failure"));
    await expect(service.requestLocationPermission()).resolves.toBe("denied");
  });

  it("capture et persiste une position avec les options par défaut", async () => {
    geoMock.getCurrentPosition.mockResolvedValue({
      timestamp: 456,
      coords: { latitude: 14.7167, longitude: -17.4677, accuracy: 8 },
    });
    const service = new GeolocationService();

    await expect(service.getCurrentPosition()).resolves.toEqual({
      latitude: 14.7167,
      longitude: -17.4677,
      accuracyMeters: 8,
      timestamp: 456,
    });
    expect(geoMock.getCurrentPosition).toHaveBeenCalledWith({
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
    expect(service.getLastKnownFromStorage()).toEqual({
      latitude: 14.7167,
      longitude: -17.4677,
      accuracyMeters: 8,
      timestamp: 456,
    });
  });

  it("gère une précision absente et les options personnalisées", async () => {
    geoMock.getCurrentPosition.mockResolvedValue({
      timestamp: 789,
      coords: { latitude: 1, longitude: 2, accuracy: null },
    });
    const service = new GeolocationService();

    await expect(service.getCurrentPosition({ enableHighAccuracy: false, timeoutMs: 5000 })).resolves.toEqual({
      latitude: 1,
      longitude: 2,
      accuracyMeters: undefined,
      timestamp: 789,
    });
    expect(geoMock.getCurrentPosition).toHaveBeenCalledWith({
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 0,
    });
  });

  it.each([
    [new Error("permission denied"), "Accès à la position refusé"],
    [new Error("request timeout"), "Délai dépassé"],
    [new Error("position unavailable"), "Position indisponible"],
    [new Error("indisponible"), "Position indisponible"],
    [new Error("other"), "Impossible d’obtenir la position"],
    ["failure", "Impossible d’obtenir la position"],
  ])("normalise l'erreur %s", async (error, message) => {
    geoMock.getCurrentPosition.mockRejectedValue(error);
    const service = new GeolocationService();

    await expect(service.getCurrentPosition()).rejects.toThrow(message);
  });
});
