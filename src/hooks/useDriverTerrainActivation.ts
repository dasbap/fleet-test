import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { DriverTerrainRepository } from '@/repositories/driver-terrain.repository';
import { DriverTerrainService } from '@/services/driver-terrain.service';
import { isValidCameroonMobileInput } from '@/lib/cameroonPhone';
import { isTerrainPath } from '@/navigation/routePaths';
import {
  buildDriverTerrainSnoozePayload,
  canApplyDriverTerrainSnooze,
  DRIVER_TERRAIN_SNOOZE_KEY_PREFIX,
  type DriverTerrainSnoozeState,
  driverTerrainSnoozeRemaining,
  parseDriverTerrainSnoozeStored,
} from '@/lib/driverTerrainSnooze';

/** Durée de cache : 30 s — évite de re-interroger à chaque navigation */
const STALE_TIME_MS = 30_000;

const driverTerrainRepository = new DriverTerrainRepository();
const driverTerrainService = new DriverTerrainService(driverTerrainRepository);

function readSnoozeState(userId: string): DriverTerrainSnoozeState {
  if (typeof window === 'undefined') return { until: null, count: 0 };
  const raw = window.localStorage.getItem(`${DRIVER_TERRAIN_SNOOZE_KEY_PREFIX}${userId}`);
  return parseDriverTerrainSnoozeStored(raw);
}

export function useDriverTerrainActivation() {
  const { user, role, userFleetId } = useAuth();
  const { pathname } = useLocation();
  const userId = user?.id;
  const isDriver = role === 'driver';
  const onTerrainHub = isTerrainPath(pathname);
  const [snoozeState, setSnoozeState] = useState<DriverTerrainSnoozeState>({ until: null, count: 0 });

  useEffect(() => {
    if (!userId) {
      setSnoozeState({ until: null, count: 0 });
      return;
    }
    setSnoozeState(readSnoozeState(userId));
  }, [userId]);

  const query = useQuery({
    queryKey: ['driver-terrain-self', userId, userFleetId],
    queryFn: () => driverTerrainService.getSelfCheck(userId!, userFleetId!),
    enabled: Boolean(isDriver && userId && userFleetId && !onTerrainHub),
    staleTime: STALE_TIME_MS,
  });

  const phoneOk = useMemo(
    () => isValidCameroonMobileInput(query.data?.phone ?? ''),
    [query.data?.phone],
  );

  const isSnoozed = useMemo(() => {
    const until = snoozeState.until;
    if (!until) return false;
    return Date.now() < until;
  }, [snoozeState.until]);

  const needsAttention = useMemo(() => {
    if (!query.data) return false;
    return !phoneOk || !query.data.hasEverShift;
  }, [query.data, phoneOk]);

  const shouldShowModal = Boolean(
    isDriver &&
      userId &&
      userFleetId &&
      !query.isLoading &&
      needsAttention &&
      !isSnoozed &&
      !onTerrainHub,
  );

  const canSnooze = canApplyDriverTerrainSnooze(snoozeState);
  const snoozeRemaining = driverTerrainSnoozeRemaining(snoozeState);

  const snoozeForOneDay = useCallback(() => {
    if (!userId || typeof window === 'undefined') return;
    setSnoozeState((prev) => {
      if (!canApplyDriverTerrainSnooze(prev)) return prev;
      const { payload, nextUntil } = buildDriverTerrainSnoozePayload(prev, Date.now());
      window.localStorage.setItem(`${DRIVER_TERRAIN_SNOOZE_KEY_PREFIX}${userId}`, payload);
      return { until: nextUntil, count: prev.count + 1 };
    });
  }, [userId]);

  return {
    shouldShowModal,
    isLoading: query.isLoading,
    phone: query.data?.phone ?? null,
    phoneOk,
    hasEverShift: query.data?.hasEverShift ?? false,
    snoozeForOneDay,
    canSnooze,
    snoozeRemaining,
    refetch: query.refetch,
  };
}
