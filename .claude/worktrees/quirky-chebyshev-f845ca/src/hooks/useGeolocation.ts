import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import type { PermissionState } from "@capacitor/core";
import { geolocationService } from "@/services/geolocation.service";
import type { GeoPermissionDisplay, GeoPositionSnapshot } from "@/types/geolocation";

function mapPermission(state: PermissionState): GeoPermissionDisplay {
  if (state === "granted" || state === "limited") return "granted";
  if (state === "denied") return "denied";
  if (state === "prompt") return "prompt";
  return "unknown";
}

export interface UseGeolocationResult {
  position: GeoPositionSnapshot | null;
  /** Dernière position réussie (stockée session). */
  lastKnownPosition: GeoPositionSnapshot | null;
  permission: GeoPermissionDisplay;
  error: string | null;
  isLoading: boolean;
  refreshPermission: () => Promise<void>;
  refreshPosition: () => Promise<void>;
  /** Natif : demande explicite ; web : équivalent à une capture (prompt navigateur). */
  requestPermission: () => Promise<void>;
  clearError: () => void;
}

/**
 * Géolocalisation terrain — service Capacitor + persistance légère de la dernière position.
 */
export function useGeolocation(): UseGeolocationResult {
  const [position, setPosition] = useState<GeoPositionSnapshot | null>(null);
  const [lastKnown, setLastKnown] = useState<GeoPositionSnapshot | null>(() =>
    geolocationService.getLastKnownFromStorage()
  );
  const [permission, setPermission] =
    useState<GeoPermissionDisplay>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPermission = useCallback(async () => {
    try {
      const p = await geolocationService.checkLocationPermission();
      setPermission(mapPermission(p));
    } catch {
      setPermission("unknown");
    }
  }, []);

  const refreshPosition = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await refreshPermission();
      const snap = await geolocationService.getCurrentPosition();
      setPosition(snap);
      setLastKnown(snap);
      await refreshPermission();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur de géolocalisation";
      setError(msg);
      setPosition(null);
    } finally {
      setIsLoading(false);
    }
  }, [refreshPermission]);

  const requestPermission = useCallback(async () => {
    setError(null);
    try {
      if (Capacitor.getPlatform() !== "web") {
        const p = await geolocationService.requestLocationPermission();
        setPermission(mapPermission(p));
        if (p === "denied") {
          setError(
            "La localisation est refusée. Activez-la dans les réglages de l’appareil."
          );
          return;
        }
      }
      await refreshPosition();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible d’obtenir la permission."
      );
    }
  }, [refreshPosition]);

  useEffect(() => {
    void refreshPermission();
    setLastKnown(geolocationService.getLastKnownFromStorage());
  }, [refreshPermission]);

  const clearError = useCallback(() => setError(null), []);

  return {
    position,
    lastKnownPosition: lastKnown,
    permission,
    error,
    isLoading,
    refreshPermission,
    refreshPosition,
    requestPermission,
    clearError,
  };
}
