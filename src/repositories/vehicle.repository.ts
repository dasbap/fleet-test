import { supabase } from '@/integrations/supabase/client';
import type {
  VehicleDto,
  VehicleInsertDto,
  VehicleStatusDto,
} from '@/types/dto/vehicle.dto';
import type { IRepository } from './base.repository';

export interface VehicleFilters {
  fleet_id?: string;
}

export interface VehicleUpdate {
  registration?: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  current_km?: number;
  status?: VehicleStatusDto;
  blocked_reason?: string | null;
}

/**
 * Repository pour l'accès aux données des véhicules
 */
export class VehicleRepository implements IRepository<VehicleDto, VehicleInsertDto, VehicleUpdate> {
  /**
   * Récupère tous les véhicules, optionnellement filtrés par flotte
   */
  async findAll(filters?: VehicleFilters): Promise<VehicleDto[]> {
    let query = supabase
      .from('vehicules')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.fleet_id) {
      query = query.eq('fleet_id', filters.fleet_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      throw new Error(error.message);
    }

    return (data || []) as VehicleDto[];
  }

  /**
   * Récupère tous les véhicules avec leurs affectations actives
   */
  async findAllWithAssignments(fleetId?: string): Promise<VehicleDto[]> {
    let query = supabase
      .from('vehicules')
      .select('*')
      .order('created_at', { ascending: false });

    if (fleetId) {
      query = query.eq('fleet_id', fleetId);
    }

    const { data: vehiclesData, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      throw new Error(error.message);
    }

    const vehicles = vehiclesData || [];
    const vehicleIds = vehicles.map((v: VehicleDto) => v.id);

    if (vehicleIds.length === 0) {
      return [] as VehicleDto[];
    }

    // Récupérer les affectations actives avec les profils des conducteurs
    const { data: assignmentsData } = await supabase
      .from('affectations_vehicules')
      .select(`
        id,
        vehicle_id,
        driver_user_id,
        driver:profils!affectations_vehicules_driver_user_id_fkey(user_id, full_name)
      `)
      .in('vehicle_id', vehicleIds)
      .eq('is_active', true);

    // Mapper les affectations aux véhicules
    const assignmentMap = new Map();
    (assignmentsData || []).forEach((a) => {
      assignmentMap.set(a.vehicle_id, {
        id: a.id,
        driver_user_id: a.driver_user_id,
        driver: a.driver,
      });
    });

    return vehicles.map((vehicle) => ({
      ...vehicle,
      active_assignment: assignmentMap.get(vehicle.id) || null,
    })) as VehicleDto[];
  }

  /**
   * Récupère tous les véhicules triés par immatriculation
   */
  async findAllSimple(fleetId?: string): Promise<VehicleDto[]> {
    let query = supabase
      .from('vehicules')
      .select('*')
      .order('registration', { ascending: true });

    if (fleetId) {
      query = query.eq('fleet_id', fleetId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      throw new Error(error.message);
    }

    return (data || []) as VehicleDto[];
  }

  /**
   * Récupère un véhicule par son ID
   */
  async findById(id: string): Promise<VehicleDto | null> {
    const { data, error } = await supabase
      .from('vehicules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Aucun résultat trouvé
        return null;
      }
      console.error('Error fetching vehicle:', error);
      throw new Error(error.message);
    }

    return data as VehicleDto;
  }

  /**
   * Détail d’un véhicule avec affectation active (conducteur) si présente.
   */
  async findByIdWithAssignment(id: string): Promise<VehicleDto | null> {
    const vehicle = await this.findById(id);
    if (!vehicle) {
      return null;
    }

    const { data: assignmentRow } = await supabase
      .from("affectations_vehicules")
      .select(
        `
        id,
        vehicle_id,
        driver_user_id,
        driver:profils!affectations_vehicules_driver_user_id_fkey(user_id, full_name)
      `
      )
      .eq("vehicle_id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignmentRow) {
      return { ...vehicle, active_assignment: null };
    }

    const rawDriver = assignmentRow.driver as unknown;
    const driverRow = Array.isArray(rawDriver) ? rawDriver[0] : rawDriver;
    const driver =
      driverRow && typeof driverRow === "object"
        ? (driverRow as { user_id: string; full_name: string | null })
        : undefined;

    return {
      ...vehicle,
      active_assignment: {
        id: assignmentRow.id,
        driver_user_id: assignmentRow.driver_user_id,
        driver,
      },
    } as Vehicle;
  }

  /**
   * Crée un nouveau véhicule
   */
  async create(vehicle: VehicleInsert): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicules')
      .insert({
        fleet_id: vehicle.fleet_id,
        registration: vehicle.registration,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        current_km: vehicle.current_km || 0,
        status: 'ok',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      throw new Error(error.message);
    }

    return data as VehicleDto;
  }

  /**
   * Met à jour un véhicule existant
   */
  async update(id: string, updates: VehicleUpdate): Promise<VehicleDto> {
    const { data, error } = await supabase
      .from('vehicules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      throw new Error(error.message);
    }

    return data as VehicleDto;
  }

  /**
   * Met à jour le kilométrage d'un véhicule
   */
  async updateKilometerage(id: string, current_km: number): Promise<VehicleDto> {
    return this.update(id, { current_km });
  }

  /**
   * Supprime un véhicule
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('vehicules').delete().eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      throw new Error(error.message);
    }
  }
}
