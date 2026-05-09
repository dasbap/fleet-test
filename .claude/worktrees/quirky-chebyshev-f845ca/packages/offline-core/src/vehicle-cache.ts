import type { CachedVehicle } from "./types";

export function upsertVehicleCache(
  vehicles: CachedVehicle[],
  vehicle: Omit<CachedVehicle, "cachedAt">,
  maxEntries: number,
): CachedVehicle[] {
  const existing = vehicles.filter((item) => item.id !== vehicle.id);
  const updated: CachedVehicle[] = [{ ...vehicle, cachedAt: new Date().toISOString() }, ...existing];
  return updated.slice(0, maxEntries);
}

export function getRecentVehicles(vehicles: CachedVehicle[], hours: number): CachedVehicle[] {
  const cutoff = Date.now() - hours * 3_600_000;
  return vehicles.filter((vehicle) => new Date(vehicle.cachedAt).getTime() > cutoff);
}
