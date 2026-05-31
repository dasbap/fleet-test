import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { MockChecklist, MockDriverDay } from "@/features/operations/mocks/operationsMock";
import {
  applyLocalChecklistOverrides,
  buildChecklistStorageKey,
  toggleLocalItem,
  type LocalChecklistState,
} from "@/services/driver-operations-checklist.service";
import { storageGet, storageSet } from "@/lib/storage/localStorageService";

const EMPTY_LOCAL: LocalChecklistState = { departure: {}, arrival: {} };

function isServerLocked(checklist: MockChecklist, itemId: string): boolean {
  return checklist.items.some((item) => item.id === itemId && item.done);
}

export function useDriverOperationalChecklists(day: MockDriverDay) {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const storageKey = useMemo(
    () => (userId ? buildChecklistStorageKey(userId, day.activeShiftId) : null),
    [userId, day.activeShiftId],
  );

  const serverPair = useMemo(
    () => ({
      departureChecklist: day.departureChecklist,
      arrivalChecklist: day.arrivalChecklist,
    }),
    [day.departureChecklist, day.arrivalChecklist],
  );

  const [local, setLocal] = useState<LocalChecklistState>(EMPTY_LOCAL);

  useEffect(() => {
    if (!storageKey) {
      setLocal(EMPTY_LOCAL);
      return;
    }
    const stored = storageGet<LocalChecklistState>(storageKey);
    setLocal(stored ?? EMPTY_LOCAL);
  }, [storageKey]);

  const merged = useMemo(
    () => applyLocalChecklistOverrides(serverPair, local),
    [serverPair, local],
  );

  const persistLocal = useCallback(
    (next: LocalChecklistState) => {
      setLocal(next);
      if (storageKey) {
        storageSet(storageKey, next);
      }
    },
    [storageKey],
  );

  const toggleDepartureItem = useCallback(
    (itemId: string) => {
      if (isServerLocked(day.departureChecklist, itemId)) return;
      persistLocal({
        ...local,
        departure: toggleLocalItem(local.departure, itemId),
      });
    },
    [day.departureChecklist, local, persistLocal],
  );

  const toggleArrivalItem = useCallback(
    (itemId: string) => {
      if (isServerLocked(day.arrivalChecklist, itemId)) return;
      persistLocal({
        ...local,
        arrival: toggleLocalItem(local.arrival, itemId),
      });
    },
    [day.arrivalChecklist, local, persistLocal],
  );

  return {
    departure: merged.departureChecklist,
    arrival: merged.arrivalChecklist,
    toggleDepartureItem,
    toggleArrivalItem,
  };
}
