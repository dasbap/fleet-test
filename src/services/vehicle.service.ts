import { VehicleRepository } from '@/repositories/vehicle.repository';
import type { FleetBillingService } from '@/services/fleet-billing.service';
import { vehicleInsertSchema } from '@/domain/schemas/vehicle.schema';
import { parseSchemaOrThrow } from '@/domain/lib/parseSchema';
import type { VehicleDto, VehicleInsertDto, VehicleStatusDto } from '@/types/dto/vehicle.dto';
import type {
  VehicleFilters,
  VehicleListItemDto,
  VehicleUpdate,
} from '@/repositories/vehicle.repository';

/**
 * Service pour la logique métier des véhicules
 */
export class VehicleService {
  constructor(
    private repository: VehicleRepository,
    private fleetBilling?: FleetBillingService,
  ) {}

  /**
   * Récupère tous les véhicules avec leurs affectations actives
   */
  async getVehicles(fleetId?: string): Promise<VehicleDto[]> {
    return this.repository.findAllWithAssignments(fleetId);
  }

  /**
   * Récupère une liste de véhicules filtrable (statut + recherche) avec prochain entretien.
   */
  async getVehicleList(
    filters?: VehicleFilters & { fleet_id?: string; status?: VehicleStatusDto; search?: string }
  ): Promise<VehicleListItemDto[]> {
    const normalizedFilters: VehicleFilters = {
      ...filters,
      search: filters?.search?.trim() || undefined,
    };

    return this.repository.findListItems(normalizedFilters);
  }

  /**
   * Récupère tous les véhicules simples (sans affectations)
   */
  async getVehiclesSimple(fleetId?: string): Promise<VehicleDto[]> {
    return this.repository.findAllSimple(fleetId);
  }

  /**
   * Récupère tous les véhicules avec filtres
   */
  async getAllVehicles(filters?: VehicleFilters): Promise<VehicleDto[]> {
    return this.repository.findAll(filters);
  }

  /**
   * Récupère un véhicule par son ID
   */
  async getVehicleById(id: string): Promise<VehicleDto | null> {
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
  ): Promise<VehicleDto | null> {
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
  async createVehicle(data: VehicleInsertDto): Promise<VehicleDto> {
    const parsed = parseSchemaOrThrow(vehicleInsertSchema, data);

    const normalizedData: VehicleInsertDto = {
      ...parsed,
      registration: parsed.registration.trim().toUpperCase(),
      current_km: parsed.current_km ?? 0,
    };

    if (this.fleetBilling) {
      const ctx = await this.fleetBilling.getFleetBillingContext(data.fleet_id);
      this.fleetBilling.assertCanAddVehicle(ctx);
    }

    try {
      return await this.repository.create(normalizedData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('limite_vehicules_plan_atteinte') ||
        msg.includes('limite_vehicules_abonnements_atteinte') ||
        msg.includes('limite_vehicules_abonnement_atteinte')
      ) {
        throw new Error("Vous avez atteint la limite de véhicules autorisée par vos abonnements.");
      }
      throw err instanceof Error ? err : new Error(msg);
    }
  }

  /**
   * Met à jour un véhicule avec validation métier
   */
  async updateVehicle(id: string, updates: VehicleUpdate): Promise<VehicleDto> {
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
  async blockVehicle(id: string, reason: string): Promise<VehicleDto> {
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
  async unblockVehicle(id: string): Promise<VehicleDto> {
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
  async updateKilometerage(id: string, current_km: number): Promise<VehicleDto> {
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
