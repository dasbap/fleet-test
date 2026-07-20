/** Position courante ou historisée (WGS84). */
export interface GeoPositionSnapshot {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  /** Horodatage millisecondes (device). */
  timestamp: number;
}

/** État agrégé des permissions de géolocalisation (Capacitor + web). */
export type GeoPermissionDisplay = "granted" | "denied" | "prompt" | "unknown";
