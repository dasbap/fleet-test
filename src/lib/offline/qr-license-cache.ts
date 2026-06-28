import { storageGet, storageSet } from "@/lib/storage/localStorageService";
import { QR_LICENSE_CACHE_TTL_MS } from "@esamba/offline-contracts";

const QR_LICENSE_CACHE_KEY = "flotte-esamba:v1:qr-license-cache";

export interface QrLicenseCacheEntry {
  vehicleId: string;
  fleetId: string;
  registration: string;
  validUntil: string;
  cachedAt: string;
}

export function cacheQrLicense(entry: Omit<QrLicenseCacheEntry, "cachedAt">): void {
  const map = readCacheMap();
  map[entry.vehicleId] = { ...entry, cachedAt: new Date().toISOString() };
  storageSet(QR_LICENSE_CACHE_KEY, map);
}

export function getCachedQrLicense(vehicleId: string): QrLicenseCacheEntry | null {
  const map = readCacheMap();
  const entry = map[vehicleId];
  if (!entry) return null;
  const age = Date.now() - new Date(entry.cachedAt).getTime();
  if (age > QR_LICENSE_CACHE_TTL_MS) {
    delete map[vehicleId];
    storageSet(QR_LICENSE_CACHE_KEY, map);
    return null;
  }
  return entry;
}

function readCacheMap(): Record<string, QrLicenseCacheEntry> {
  return storageGet<Record<string, QrLicenseCacheEntry>>(QR_LICENSE_CACHE_KEY) ?? {};
}
