/**
 * Feature flags terrain — migration progressive Capacitor → Expo.
 * VITE_TERRAIN_EXPO_FLEET_IDS : liste UUID flottes pilotes séparées par des virgules.
 */
export function isTerrainExpoEnabledForFleet(fleetId: string | null | undefined): boolean {
  if (!fleetId) return false;
  const raw = import.meta.env.VITE_TERRAIN_EXPO_FLEET_IDS?.trim();
  if (!raw) return false;
  const ids = raw.split(",").map((id) => id.trim()).filter(Boolean);
  return ids.includes(fleetId);
}

export function shouldRedirectDriverToExpo(fleetId: string | null | undefined): boolean {
  return isTerrainExpoEnabledForFleet(fleetId);
}
