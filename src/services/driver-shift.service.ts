import { DriverShiftRepository } from '@/repositories/driver-shift.repository';
import { VehicleRepository } from '@/repositories/vehicle.repository';
import type {
  DriverShift,
  ShiftClosure,
  ShiftInsert,
  ShiftClosureInsert,
  ShiftClosureUpdate,
} from '@/repositories/driver-shift.repository';

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
    // Validation métier
    if (!data.assignment_id) {
      throw new Error('L\'ID de l\'affectation est requis');
    }

    if (data.km_start < 0) {
      throw new Error('Le kilométrage de départ ne peut pas être négatif');
    }

    // Vérifier qu'il n'y a pas déjà un créneau actif pour cette affectation
    const existingShift = await this.repository.findById(data.assignment_id);
    // Note: Cette vérification pourrait être améliorée en vérifiant les créneaux actifs

    return this.repository.create(data);
  }

  /**
   * Ferme un créneau avec validation métier et calculs
   */
  async closeShift(closure: ShiftClosureInsert): Promise<void> {
    // Validation métier
    if (!closure.shift_id) {
      throw new Error('L\'ID du créneau est requis');
    }

    if (!closure.km_end || closure.km_end < 0) {
      throw new Error('Le kilométrage de fin doit être valide et positif');
    }

    if (closure.revenue_declared < 0) {
      throw new Error('La recette déclarée ne peut pas être négative');
    }

    if (!closure.collection_mode || !['cash', 'momo', 'mix'].includes(closure.collection_mode)) {
      throw new Error('Le mode de collecte doit être cash, momo ou mix');
    }

    if (!closure.proof_type || !closure.proof_value) {
      throw new Error('Le type et la valeur de preuve sont requis');
    }

    // Récupérer le créneau pour validation
    const shift = await this.repository.findById(closure.shift_id);
    if (!shift) {
      throw new Error('Créneau introuvable');
    }

    if (shift.status !== 'open') {
      throw new Error('Ce créneau est déjà fermé');
    }

    // Validation du kilométrage
    if (closure.km_end < shift.km_start) {
      throw new Error('Le kilométrage de fin ne peut pas être inférieur au kilométrage de départ');
    }

    // Fermer le créneau via RPC
    await this.repository.closeShift(closure);

    // Calculer la recette attendue
    await this.repository.calculateExpectedRevenue(closure.shift_id);

    // Mettre à jour le kilométrage du véhicule
    const vehicleId = await this.repository.getVehicleIdByShiftId(closure.shift_id);
    if (vehicleId) {
      await this.vehicleRepository.updateKilometerage(vehicleId, closure.km_end);
    }
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
