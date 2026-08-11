import { supabase } from '@/integrations/supabase/client';
import { asSingleRelation } from '@/lib/supabaseRelation';
import type {
  VehicleDto,
  VehicleInsertDto,
  VehicleStatusDto,
} from '@/types/dto/vehicle.dto';
import type { IRepository } from './base.repository';

export interface VehicleFilters {
  fleet_id?: string;
  status?: VehicleStatusDto;
  search?: string;
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

export interface VehicleListItemDto extends VehicleDto {
  next_maintenance_at: string | null;
}

interface ActiveAssignmentRow {
  id: string;
  vehicle_id: string;
  driver_user_id: string;
}

/**
 * Repository pour l'accès aux données des véhicules
 */
export class VehicleRepository implements IRepository<VehicleDto, VehicleInsertDto, VehicleUpdate> {
  private async buildActiveAssignmentMap(
    vehicleIds: string[],
  ): Promise<Map<string, VehicleDto['active_assignment']>> {
    if (vehicleIds.length === 0) {
      return new Map();
    }

    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('affectations_vehicules')
      .select('id, vehicle_id, driver_user_id')
      .in('vehicle_id', vehicleIds)
      .eq('is_active', true);

    if (assignmentsError) {
      console.error('Error fetching active vehicle assignments:', assignmentsError);
      throw new Error(assignmentsError.message);
    }

    const assignments = (assignmentsData ?? []) as ActiveAssignmentRow[];
    const driverIds = [...new Set(assignments.map((assignment) => assignment.driver_user_id))];
    const { data: profiles, error: profilesError } = driverIds.length
      ? await supabase
          .from('profils')
          .select('user_id, full_name')
          .in('user_id', driverIds)
      : { data: [], error: null };

    if (profilesError) {
      console.error('Error fetching assignment driver profiles:', profilesError);
      throw new Error(profilesError.message);
    }

    const profileByUserId = new Map(
      (profiles ?? []).map((profile) => [profile.user_id, profile]),
    );
    const assignmentMap = new Map<string, VehicleDto['active_assignment']>();

    assignments.forEach((assignment) => {
      assignmentMap.set(assignment.vehicle_id, {
        id: assignment.id,
        driver_user_id: assignment.driver_user_id,
        driver: profileByUserId.get(assignment.driver_user_id) ?? null,
      });
    });

    return assignmentMap;
  }

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
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.search) {
      const search = `%${filters.search}%`;
      query = query.or(`registration.ilike.${search},brand.ilike.${search},model.ilike.${search}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicles:', error);
      throw new Error(error.message);
    }

    return (data || []) as VehicleDto[];
  }

  /**
   * Récupère les véhicules avec affectation active et prochain entretien.
   */
  async findListItems(filters?: VehicleFilters): Promise<VehicleListItemDto[]> {
    let query = supabase
      .from('vehicules')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.fleet_id) {
      query = query.eq('fleet_id', filters.fleet_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.search) {
      const search = `%${filters.search}%`;
      query = query.or(`registration.ilike.${search},brand.ilike.${search},model.ilike.${search}`);
    }

    const { data: vehiclesData, error } = await query;

    if (error) {
      console.error('Error fetching vehicle list items:', error);
      throw new Error(error.message);
    }

    const vehicles = (vehiclesData || []) as VehicleDto[];
    const vehicleIds = vehicles.map((v) => v.id);

    if (vehicleIds.length === 0) {
      return [];
    }

    const assignmentMap = await this.buildActiveAssignmentMap(vehicleIds);

    const { data: maintenanceData } = await supabase
      .from('travaux_maintenance')
      .select('vehicle_id, planned_at')
      .in('vehicle_id', vehicleIds)
      .not('planned_at', 'is', null)
      .order('planned_at', { ascending: true });

    const nextMaintenanceMap = new Map<string, string>();
    (maintenanceData || []).forEach((row) => {
      if (!nextMaintenanceMap.has(row.vehicle_id) && row.planned_at) {
        nextMaintenanceMap.set(row.vehicle_id, row.planned_at);
      }
    });

    return vehicles.map((vehicle) => ({
      ...vehicle,
      active_assignment: assignmentMap.get(vehicle.id) || null,
      next_maintenance_at: nextMaintenanceMap.get(vehicle.id) || null,
    }));
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
        driver_user_id
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
      .maybeSingle();

    if (error) {
      console.error('Error fetching vehicle:', error);
      throw new Error(error.message);
    }

    return (data ?? null) as VehicleDto | null;
  }

  async findByRegistration(
    registration: string,
    fleetId: string
  ): Promise<VehicleDto | null> {
    const { data, error } = await supabase
      .from("vehicules")
      .select("*")
      .eq("fleet_id", fleetId)
      .eq("registration", registration)
      .maybeSingle();

    if (error) {
      console.error("Error fetching vehicle by registration:", error);
      throw new Error(error.message);
    }

    return (data ?? null) as VehicleDto | null;
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
        driver_user_id
      `
      )
      .eq("vehicle_id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignmentRow) {
      return { ...vehicle, active_assignment: null };
    }

    const { data: driverProfile, error: driverProfileError } = await supabase
      .from("profils")
      .select("user_id, full_name")
      .eq("user_id", assignmentRow.driver_user_id)
      .maybeSingle();

    if (driverProfileError) {
      console.error("Error fetching assignment driver profile:", driverProfileError);
      throw new Error(driverProfileError.message);
    }

    return {
      ...vehicle,
      active_assignment: {
        id: assignmentRow.id,
        driver_user_id: assignmentRow.driver_user_id,
        driver: driverProfile ?? null,
      },
    } as VehicleDto;
  }

  /**
   * Véhicule de l’affectation active d’un conducteur (vue « Ma journée »).
   */
  async findActiveAssignmentVehicleForDriver(
    driverUserId: string,
  ): Promise<VehicleDto | null> {
    const { data, error } = await supabase
      .from("affectations_vehicules")
      .select(
        `
        id,
        fleet_id,
        driver_user_id,
        vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(
          id,
          fleet_id,
          registration,
          brand,
          model,
          year,
          current_km,
          status,
          blocked_reason,
          created_at
        )
      `,
      )
      .eq("driver_user_id", driverUserId)
      .eq("is_active", true)
      .order("starts_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching active assignment for driver:", error);
      throw new Error(error.message);
    }

    const row = (data || [])[0] as
      | {
          id: string;
          fleet_id: string;
          driver_user_id: string;
          vehicle: VehicleDto | VehicleDto[] | null;
        }
      | undefined;

    if (!row?.id) {
      return null;
    }

    const vehicle = asSingleRelation(row.vehicle);
    if (!vehicle) {
      return null;
    }

    return {
      ...vehicle,
      fleet_id: vehicle.fleet_id || row.fleet_id,
      current_km: vehicle.current_km ?? 0,
      active_assignment: {
        id: row.id,
        driver_user_id: row.driver_user_id,
        driver: null,
      },
    };
  }

  /**
   * Crée un nouveau véhicule
   */
  async create(vehicle: VehicleInsertDto): Promise<VehicleDto> {
    if (vehicle.subscription_id) {
      const { data, error } = await supabase.rpc('create_vehicle_with_subscription', {
        p_fleet_id: vehicle.fleet_id,
        p_subscription_id: vehicle.subscription_id,
        p_registration: vehicle.registration,
        p_brand: vehicle.brand ?? null,
        p_model: vehicle.model ?? null,
        p_year: vehicle.year ?? null,
        p_current_km: vehicle.current_km ?? 0,
      });

      if (error) {
        console.error('Error creating vehicle with subscription:', error);
        throw new Error(error.message);
      }

      return data as VehicleDto;
    }

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
      .maybeSingle();

    if (error) {
      console.error('Error updating vehicle:', error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Véhicule introuvable ou accès refusé');
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
