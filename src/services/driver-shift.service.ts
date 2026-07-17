import { DriverShiftRepository } from '@/repositories/driver-shift.repository';
import { VehicleRepository } from '@/repositories/vehicle.repository';
import type {
  DriverShift,
  ShiftClosure,
  ShiftInsert,
  ShiftClosureInsert,
  ShiftClosureUpdate,
  PendingFleetClosure,
} from '@/repositories/driver-shift.repository';
import { shiftClosureInsertSchema, shiftStartSchema } from '@/domain/schemas/driver-shift.schema';
import { parseSchemaOrThrow } from '@/domain/lib/parseSchema';
import type { OfflineShiftClosePayload, OfflineShiftStartPayload } from '@/types/offline-queue';

/**
 * Service pour la logique métier des créneaux conducteurs
 */
export class DriverShiftService {
  constructor(
    private repository: DriverShiftRepository,
    private vehicleRepository: VehicleRepository
  ) {}

  /**
   * Récupère le créneau actif d'un conducteur
   */
  async getActiveShift(driverId: string): Promise<DriverShift | null> {
    if (!driverId) {
      return null;
    }

    return this.repository.findActiveShiftByDriverId(driverId);
  }

  /**
   * Récupère tous les créneaux d'un conducteur
   */
  async getDriverShifts(driverId: string, limit?: number): Promise<DriverShift[]> {
    if (!driverId) {
      return [];
    }

    return this.repository.findAllByDriverId(driverId, limit);
  }

  /**
   * Récupère un créneau par son ID
   */
  async getShiftById(shiftId: string): Promise<DriverShift | null> {
    if (!shiftId) {
      throw new Error('L\'ID du créneau est requis');
    }

    return this.repository.findById(shiftId);
  }

  /**
   * Démarre un nouveau créneau avec validation métier
   */
  async startShift(data: ShiftInsert): Promise<DriverShift> {
    const parsed = parseSchemaOrThrow(shiftStartSchema, data);
    return this.repository.create(parsed);
  }

  /**
   * Ferme un créneau avec validation métier et calculs
   */
  async closeShift(closure: ShiftClosureInsert): Promise<void> {
    const parsed = parseSchemaOrThrow(shiftClosureInsertSchema, closure);

    const shift = await this.repository.findById(parsed.shift_id);
    if (!shift) {
      throw new Error('Créneau introuvable');
    }

    if (shift.status !== 'open') {
      throw new Error('Ce créneau est déjà fermé');
    }

    // Validation du kilométrage
    if (parsed.km_end < shift.km_start) {
      throw new Error('Le kilométrage de fin ne peut pas être inférieur au kilométrage de départ');
    }

    await this.repository.closeShift(parsed);

    await this.repository.calculateExpectedRevenue(parsed.shift_id);

    // Le km véhicule est mis à jour par la RPC fermer_creneau (SECURITY DEFINER).
  }

  buildOfflineShiftStartPayload(data: ShiftInsert): OfflineShiftStartPayload {
    if (!data.assignment_id) {
      throw new Error("L'ID de l'affectation est requis");
    }
    if (data.km_start < 0) {
      throw new Error('Le kilométrage de départ ne peut pas être négatif');
    }
    return {
      assignmentId: data.assignment_id,
      kmStart: data.km_start,
    };
  }

  buildOfflineShiftClosePayload(closure: ShiftClosureInsert): OfflineShiftClosePayload {
    if (!closure.shift_id) {
      throw new Error("L'ID du créneau est requis");
    }
    if (closure.km_end < 0) {
      throw new Error('Le kilométrage de fin doit être positif');
    }
    if (closure.revenue_declared < 0) {
      throw new Error('La recette déclarée ne peut pas être négative');
    }
    if (!closure.proof_type || !closure.proof_value) {
      throw new Error('Le type et la valeur de preuve sont requis');
    }
    return {
      shiftId: closure.shift_id,
      kmEnd: closure.km_end,
      revenueDeclared: closure.revenue_declared,
      collectionMode: closure.collection_mode,
      proofType: closure.proof_type,
      proofValue: closure.proof_value,
    };
  }

  /**
   * Récupère toutes les clôtures d'un conducteur
   */
  async getShiftClosures(driverId: string): Promise<ShiftClosure[]> {
    if (!driverId) {
      return [];
    }

    return this.repository.findAllClosuresByDriverId(driverId);
  }

  /**
   * Récupère les clôtures en attente de validation pour une flotte.
   */
  async getPendingClosuresForFleet(fleetId: string): Promise<PendingFleetClosure[]> {
    if (!fleetId) {
      return [];
    }
    return this.repository.findPendingClosuresForFleet(fleetId);
  }

  /**
   * Valide ou rejette une clôture
   */
  async reviewClosure(
    closureId: string,
    status: 'validated' | 'rejected',
    validatedBy: string
  ): Promise<ShiftClosure> {
    // Validation métier
    if (!closureId) {
      throw new Error('L\'ID de la clôture est requis');
    }

    if (!validatedBy) {
      throw new Error('L\'ID du validateur est requis');
    }

    if (!['validated', 'rejected'].includes(status)) {
      throw new Error('Le statut doit être validated ou rejected');
    }

    const updates: ShiftClosureUpdate = {
      status,
      validated_by: validatedBy,
      validated_at: new Date().toISOString(),
    };

    return this.repository.updateClosure(closureId, updates);
  }
}
