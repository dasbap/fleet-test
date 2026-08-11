export interface VehicleSlotLimitInput {
  planCode: string;
  requestedVehicleCount: number;
  planMaxVehicles?: number | null;
}

export function assertVehicleCountWithinPlanLimit({
  planCode,
  requestedVehicleCount,
  planMaxVehicles,
}: VehicleSlotLimitInput): void {
  if (!Number.isInteger(requestedVehicleCount) || requestedVehicleCount < 1) {
    throw new Error("Au moins un vehicule est requis.");
  }

  if (planMaxVehicles !== null && planMaxVehicles !== undefined && requestedVehicleCount > planMaxVehicles) {
    throw new Error(
      `Le plan ${planCode} est limite a ${planMaxVehicles} vehicule${planMaxVehicles > 1 ? "s" : ""}.`,
    );
  }
}

export function resolveRenewedVehicleSlots({
  currentVehicleSlots,
  requestedVehicleCount,
  planMaxVehicles,
}: {
  currentVehicleSlots?: number | null;
  requestedVehicleCount: number;
  planMaxVehicles?: number | null;
}): number {
  assertVehicleCountWithinPlanLimit({
    planCode: "selectionne",
    requestedVehicleCount,
    planMaxVehicles,
  });

  const nextSlots = Math.max(currentVehicleSlots ?? 0, requestedVehicleCount);
  if (planMaxVehicles !== null && planMaxVehicles !== undefined && nextSlots > planMaxVehicles) {
    throw new Error(
      `Le plan selectionne est limite a ${planMaxVehicles} vehicule${planMaxVehicles > 1 ? "s" : ""}.`,
    );
  }

  return Math.max(1, nextSlots);
}
