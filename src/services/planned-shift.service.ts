import { PlannedShiftRepository } from '@/repositories/planned-shift.repository';
import type { PlannedShift, PlannedShiftInsert } from '@/repositories/planned-shift.repository';
import { plannedShiftCreateSchema } from '@/domain/schemas/planned-shift.schema';
import { parseSchemaOrThrow } from '@/domain/lib/parseSchema';

/** Fenêtre de tolérance pour lier un créneau planifié à l'ouverture (2 h). */
const LINK_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * Service métier pour la planification de créneaux conducteurs.
 */
export class PlannedShiftService {
  constructor(private repository: PlannedShiftRepository) {}

  async getPlannedShiftsForFleetToday(fleetId: string): Promise<PlannedShift[]> {
    if (!fleetId) {
      return [];
    }
    return this.repository.findByFleetToday(fleetId);
  }

  async getUpcomingForDriver(driverUserId: string): Promise<PlannedShift | null> {
    if (!driverUserId) {
      return null;
    }
    return this.repository.findUpcomingForDriver(driverUserId);
  }

  async createPlannedShift(
    data: PlannedShiftInsert,
    createdBy: string,
  ): Promise<PlannedShift> {
    const parsed = parseSchemaOrThrow(plannedShiftCreateSchema, {
      fleet_id: data.fleet_id,
      driver_user_id: data.driver_user_id,
      vehicle_id: data.vehicle_id,
      planned_start: data.planned_start,
      planned_end: data.planned_end ?? null,
      notes: data.notes ?? null,
    });

    if (new Date(parsed.planned_start).getTime() < Date.now() - LINK_WINDOW_MS) {
      throw new Error('La date de début ne peut pas être dans le passé');
    }

    return this.repository.create({
      ...parsed,
      created_by: createdBy,
    });
  }

  async cancelPlannedShift(plannedShiftId: string): Promise<void> {
    if (!plannedShiftId) {
      throw new Error('Identifiant du créneau planifié requis');
    }
    await this.repository.cancel(plannedShiftId);
  }

  /**
   * Lie le créneau opérationnel au créneau planifié confirmé le plus proche.
   */
  async linkOnShiftStart(driverUserId: string, creneauId: string): Promise<void> {
    if (!driverUserId || !creneauId) {
      return;
    }

    const planned = await this.repository.findUpcomingForDriver(driverUserId);
    if (!planned) {
      return;
    }

    const startMs = new Date(planned.planned_start).getTime();
    const nowMs = Date.now();
    const endMs = planned.planned_end
      ? new Date(planned.planned_end).getTime()
      : startMs + LINK_WINDOW_MS;

    const inWindow = nowMs >= startMs - LINK_WINDOW_MS && nowMs <= endMs + LINK_WINDOW_MS;
    if (!inWindow) {
      return;
    }

    await this.repository.linkToCreneau(planned.id, creneauId);
  }
}
