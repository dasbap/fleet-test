import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { DriverProfileRepository } from '@/repositories/driver-profile.repository';
import { DriverShiftRepository } from '@/repositories/driver-shift.repository';
import { isValidCameroonMobileInput } from '@/lib/cameroonPhone';
import {
  buildDriverTerrainSnoozePayload,
  canApplyDriverTerrainSnooze,
  DRIVER_TERRAIN_SNOOZE_KEY_PREFIX,
  type DriverTerrainSnoozeState,
  driverTerrainSnoozeRemaining,
  parseDriverTerrainSnoozeStored,
} from '@/lib/driverTerrainSnooze';

const profileRepo = new DriverProfileRepository();
const shiftRepo = new DriverShiftRepository();

function readSnoozeState(userId: string): DriverTerrainSnoozeState {
  if (typeof window === 'undefined') return { until: null, count: 0 };
  const raw = window.localStorage.getItem(`${DRIVER_TERRAIN_SNOOZE_KEY_PREFIX}${userId}`);
  return parseDriverTerrainSnoozeStored(raw);
}

export function useDriverTerrainActivation() {
  const { user, role, userFleetId } = useAuth();
  const userId = user?.id;
  const isDriver = role === 'driver';
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
    queryFn: async () => {
      if (!userId || !userFleetId) return null;
      const [profile, hasEverShift] = await Promise.all([
        profileRepo.findByDriverAndFleet(userId, userFleetId),
        shiftRepo.hasDriverEverOpenedShift(userId),
      ]);
      return {
        phone: profile?.phone ?? null,
        hasEverShift,
      };
    },
    enabled: Boolean(isDriver && userId && userFleetId),
    staleTime: 30_000,
  });

  const phoneOk = useMemo(() => isValidCameroonMobileInput(query.data?.phone ?? ''), [query.data?.phone]);

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
    isDriver && userId && userFleetId && !query.isLoading && needsAttention && !isSnoozed,
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
  };
}
