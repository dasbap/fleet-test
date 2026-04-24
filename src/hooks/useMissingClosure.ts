import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { DriverShiftRepository } from "@/repositories/driver-shift.repository";

const repo = new DriverShiftRepository();

const TODAY_MIDNIGHT = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * Retourne les créneaux ouverts qui auraient dû être clôturés (démarrés avant aujourd'hui minuit).
 * Utilise le rôle backoffice : n'est pertinent que pour organizer/manager.
 */
export function useMissingClosure() {
  const { userFleetId } = useAuth();

  const { data: openShifts = [], isLoading } = useQuery({
    queryKey: ["open-shifts", userFleetId],
    queryFn: () =>
      userFleetId ? repo.findOpenShiftsByFleetId(userFleetId) : [],
    enabled: !!userFleetId,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const overdueShifts = useMemo(
    () =>
      openShifts.filter((s) => {
        const startedAt = s.started_at ? new Date(s.started_at).getTime() : 0;
        return startedAt > 0 && startedAt < TODAY_MIDNIGHT();
      }),
    [openShifts],
  );

  return {
    overdueShifts,
    overdueCount: overdueShifts.length,
    isLoading,
  };
}
