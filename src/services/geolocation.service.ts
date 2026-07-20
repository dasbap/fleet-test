import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import type { PermissionState } from "@capacitor/core";
import type { GeoPositionSnapshot } from "@/types/geolocation";

const LAST_GEO_KEY = "esamba_geo_last_position";

/**
 * Messages utilisateur (pas de fuite de détails techniques).
 */
function mapGeolocationError(err: unknown): Error {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: string }).message)
      : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("denied") || lower.includes("permission")) {
    return new Error(
      "Accès à la position refusé. Activez la localisation dans les réglages du téléphone."
    );
  }
  if (lower.includes("timeout") || lower.includes("time out")) {
    return new Error(
      "Délai dépassé pour obtenir la position. Réessayez à l’air libre."
    );
  }
  if (lower.includes("unavailable") || lower.includes("indisponible")) {
    return new Error(
      "Position indisponible (GPS ou réseau). Réessayez dans un instant."
    );
  }
  return new Error(
    "Impossible d’obtenir la position. Vérifiez la localisation et réessayez."
  );
}

function readStoredLastPosition(): GeoPositionSnapshot | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LAST_GEO_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as GeoPositionSnapshot;
    if (
      typeof p.latitude === "number" &&
      typeof p.longitude === "number" &&
      typeof p.timestamp === "number"
    ) {
      return p;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredLastPosition(snapshot: GeoPositionSnapshot): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(LAST_GEO_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / mode privé */
  }
}

function positionFromCapacitor(pos: {
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  };
}): GeoPositionSnapshot {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracyMeters: pos.coords.accuracy ?? undefined,
    timestamp: pos.timestamp,
  };
}

/**
 * Accès géolocalisation — Capacitor (natif + WebView) avec repli navigateur si besoin.
 * À utiliser via `useGeolocation` côté UI ; le service reste testable sans React.
 */
export class GeolocationService {
  /** Dernière position connue (session), pour affichage hors capture immédiate. */
  getLastKnownFromStorage(): GeoPositionSnapshot | null {
    return readStoredLastPosition();
  }

  persistLastKnown(snapshot: GeoPositionSnapshot): void {
    writeStoredLastPosition(snapshot);
  }

  /**
   * Vérifie les permissions (alias `location`).
   * Sur le web, peut retourner `prompt` si l’API Permissions n’est pas fiable.
   */
  async checkLocationPermission(): Promise<PermissionState> {
    try {
      const { location } = await Geolocation.checkPermissions();
      return location;
    } catch {
      return "prompt";
    }
  }

  /**
   * Demande l’accès à la position.
   * Sur le web, `requestPermissions` n’existe pas : utiliser `getCurrentPosition` pour déclencher le prompt navigateur.
   */
  async requestLocationPermission(): Promise<PermissionState> {
    if (Capacitor.getPlatform() === "web") {
      return this.checkLocationPermission();
    }
    try {
      const { location } = await Geolocation.requestPermissions();
      return location;
    } catch {
      return "denied";
    }
  }

  /**
   * Lit la position actuelle (une capture).
   */
  async getCurrentPosition(options?: {
    enableHighAccuracy?: boolean;
    timeoutMs?: number;
  }): Promise<GeoPositionSnapshot> {
    const enableHighAccuracy = options?.enableHighAccuracy ?? true;
    const timeout = options?.timeoutMs ?? 20000;

    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy,
        timeout,
        maximumAge: 0,
      });
      const snap = positionFromCapacitor(pos);
      this.persistLastKnown(snap);
      return snap;
    } catch (e) {
      throw mapGeolocationError(e);
    }
  }
}

export const geolocationService = new GeolocationService();
