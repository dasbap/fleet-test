import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useVehicles } from "@/hooks/useVehicles";
import { useAlerts } from "@/hooks/useAlerts";
import { useActiveAssignments } from "@/hooks/useAssignments";
import { useActiveShift } from "@/hooks/useDriverShifts";
import {
  computeVehicleKpis,
  countCriticalUnresolvedAlerts,
  type MobileHomeKpis,
} from "@/lib/mobileHomeKpi";
import { mapOperationalAlertDtoToDomain } from "@/services/mappers/alert.dto.mapper";

interface UseMobileHomeKpisResult {
  kpis: MobileHomeKpis;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Agrège véhicules, alertes non résolues, maintenance et missions pour l’accueil mobile.
 */
export function useMobileHomeKpis(): UseMobileHomeKpisResult {
  const { role, userFleetId, user } = useAuth();
  const driverUserId = user?.id;

  const vehiclesQ = useVehicles(userFleetId ?? undefined);
  const alertsQ = useAlerts();
  const assignmentsQ = useActiveAssignments(userFleetId ?? undefined);
  const activeShiftQ = useActiveShift();

  const kpis = useMemo((): MobileHomeKpis => {
    const vehicles = vehiclesQ.data ?? [];
    const alerts = (alertsQ.data ?? []).map(mapOperationalAlertDtoToDomain);

    const { activeVehicles, immobilizedVehicles } = computeVehicleKpis(
      vehicles,
      role,
      driverUserId
    );
    const criticalAlertsOpen = userFleetId
      ? countCriticalUnresolvedAlerts(alerts)
      : 0;

    let missionsInProgress = 0;
    if (role === "driver") {
      missionsInProgress = activeShiftQ.data ? 1 : 0;
    } else {
      missionsInProgress = assignmentsQ.data?.length ?? 0;
    }

    return {
      activeVehicles,
      immobilizedVehicles,
      criticalAlertsOpen,
      missionsInProgress,
    };
  }, [
    vehiclesQ.data,
    alertsQ.data,
    assignmentsQ.data,
    activeShiftQ.data,
    role,
    driverUserId,
    userFleetId,
  ]);

  const isLoading =
    !!userFleetId &&
    (vehiclesQ.isLoading ||
      alertsQ.isLoading ||
      (role === "driver" ? activeShiftQ.isLoading : assignmentsQ.isLoading));

  const isError =
    vehiclesQ.isError ||
    alertsQ.isError ||
    (role === "driver" ? activeShiftQ.isError : assignmentsQ.isError);

  return { kpis, isLoading, isError };
}
