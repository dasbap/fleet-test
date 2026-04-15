import { AssignmentRepository } from '@/repositories/assignment.repository';
import type {
  DriverRow,
  AssignmentRow,
  AssignmentHistoryRow,
} from '@/repositories/assignment.repository';

/**
 * Service pour les affectations véhicule–chauffeur et la liste des conducteurs.
 */
export class AssignmentService {
  constructor(private repository: AssignmentRepository) {}

  async getFleetDrivers(fleetId: string): Promise<DriverRow[]> {
    if (!fleetId) return [];
    return this.repository.getDriversByFleet(fleetId);
  }

  async getActiveAssignments(fleetId?: string): Promise<AssignmentRow[]> {
    return this.repository.getActiveAssignments(fleetId);
  }

  async getDriverAssignmentHistory(driverUserId: string): Promise<AssignmentHistoryRow[]> {
    if (!driverUserId) return [];
    return this.repository.getDriverAssignmentHistory(driverUserId);
  }

  async assignVehicle(params: {
    fleet_id: string;
    vehicle_id: string;
    driver_user_id: string;
    starts_at?: string;
  }): Promise<string> {
    if (!params.fleet_id || !params.vehicle_id || !params.driver_user_id) {
      throw new Error('fleet_id, vehicle_id et driver_user_id sont requis');
    }
    const starts_at = params.starts_at ?? new Date().toISOString();
    try {
      return await this.repository.assignVehicle({
        fleet_id: params.fleet_id,
        vehicle_id: params.vehicle_id,
        driver_user_id: params.driver_user_id,
        starts_at,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('vehicle_not_found')) throw new Error('Véhicule non trouvé dans cette flotte');
      if (message.includes('vehicle_blocked')) throw new Error('Ce véhicule est actuellement bloqué');
      if (message.includes('missing_closure_blocks_assignment'))
        throw new Error('Une clôture manquante empêche cette affectation');
      if (message.includes('driver_already_assigned')) throw new Error('Ce chauffeur a déjà un véhicule affecté');
      throw err;
    }
  }

  async endAssignment(assignmentId: string): Promise<AssignmentRow> {
    if (!assignmentId) throw new Error('ID d\'affectation requis');
    return this.repository.endAssignment(assignmentId);
  }
}
