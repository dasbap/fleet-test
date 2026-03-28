import { VehicleRepository } from '@/repositories/vehicle.repository';
import type { Vehicle, VehicleInsert, VehicleStatus } from '@/hooks/useVehicles';
import type { VehicleFilters, VehicleUpdate } from '@/repositories/vehicle.repository';

/**
 * Service pour la logique métier des véhicules
 */
export class VehicleService {
  constructor(private repository: VehicleRepository) {}

  /**
   * Récupère tous les véhicules avec leurs affectations actives
   */
  async getVehicles(fleetId?: string): Promise<Vehicle[]> {
    return this.repository.findAllWithAssignments(fleetId);
  }

  /**
   * Récupère tous les véhicules simples (sans affectations)
   */
  async getVehiclesSimple(fleetId?: string): Promise<Vehicle[]> {
    return this.repository.findAllSimple(fleetId);
  }

  /**
   * Récupère tous les véhicules avec filtres
   */
  async getAllVehicles(filters?: VehicleFilters): Promise<Vehicle[]> {
    return this.repository.findAll(filters);
  }

  /**
   * Récupère un véhicule par son ID
   */
  async getVehicleById(id: string): Promise<Vehicle | null> {
    if (!id) {
      throw new Error('L\'ID du véhicule est requis');
    }
    return this.repository.findById(id);
  }

  /**
   * Détail véhicule pour une flotte (accès restreint à la flotte courante).
   */
  async getVehicleDetailForFleet(
    vehicleId: string,
    fleetId: string | null
  ): Promise<Vehicle | null> {
    if (!vehicleId || !fleetId) {
      return null;
    }
    const vehicle = await this.repository.findByIdWithAssignment(vehicleId);
    if (!vehicle || vehicle.fleet_id !== fleetId) {
      return null;
    }
    return vehicle;
  }

  /**
   * Crée un nouveau véhicule avec validation métier
   */
  async createVehicle(data: VehicleInsert): Promise<Vehicle> {
    // Validation métier
    if (!data.registration || data.registration.trim() === '') {
      throw new Error('Le numéro d\'immatriculation est requis');
    }

    if (!data.fleet_id) {
      throw new Error('L\'ID de la flotte est requis');
    }

    // Normalisation des données
    const normalizedData: VehicleInsert = {
      ...data,
      registration: data.registration.trim().toUpperCase(),
      current_km: data.current_km || 0,
    };

    return this.repository.create(normalizedData);
  }

  /**
   * Met à jour un véhicule avec validation métier
   */
  async updateVehicle(id: string, updates: VehicleUpdate): Promise<Vehicle> {
    if (!id) {
      throw new Error('L\'ID du véhicule est requis');
    }

    // Normalisation des données si nécessaire
    const normalizedUpdates: VehicleUpdate = { ...updates };
    if (updates.registration) {
      normalizedUpdates.registration = updates.registration.trim().toUpperCase();
    }

    return this.repository.update(id, normalizedUpdates);
  }

  /**
   * Bloque un véhicule avec validation métier
   */
  async blockVehicle(id: string, reason: string): Promise<Vehicle> {
    if (!id) {
      throw new Error('L\'ID du véhicule est requis');
    }

    if (!reason || reason.trim() === '') {
      throw new Error('Une raison de blocage est requise');
    }

    return this.repository.update(id, {
      status: 'blocked',
      blocked_reason: reason.trim(),
    });
  }

  /**
   * Débloque un véhicule
   */
  async unblockVehicle(id: string): Promise<Vehicle> {
    if (!id) {
      throw new Error('L\'ID du véhicule est requis');
    }

    return this.repository.update(id, {
      status: 'ok',
      blocked_reason: null,
    });
  }

  /**
   * Met à jour le kilométrage d'un véhicule avec validation
   */
  async updateKilometerage(id: string, current_km: number): Promise<Vehicle> {
    if (!id) {
      throw new Error('L\'ID du véhicule est requis');
    }

    if (current_km < 0) {
      throw new Error('Le kilométrage ne peut pas être négatif');
    }

    return this.repository.updateKilometerage(id, current_km);
  }

  /**
   * Supprime un véhicule avec validation métier
   */
  async deleteVehicle(id: string): Promise<void> {
    if (!id) {
      throw new Error('L\'ID du véhicule est requis');
    }

    // Vérifier que le véhicule existe
    const vehicle = await this.repository.findById(id);
    if (!vehicle) {
      throw new Error('Véhicule introuvable');
    }

    // Logique métier : vérifier s'il y a des affectations actives
    // Cette vérification pourrait être ajoutée si nécessaire

    return this.repository.delete(id);
  }
}
