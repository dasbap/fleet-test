import { supabase } from '@/integrations/supabase/client';
import { throwIfSupabaseInfrastructureError } from '@/lib/supabase-runtime-errors';
import { asSingleRelation } from '@/lib/supabaseRelation';

export interface DriverRow {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
}

export interface AssignmentRow {
  id: string;
  fleet_id: string;
  vehicle_id: string;
  driver_user_id: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  vehicle?: {
    id: string;
    registration: string;
    brand: string | null;
    model: string | null;
  } | null;
  driver?: {
    user_id: string;
    full_name: string | null;
  } | null;
}

export interface AssignmentHistoryRow {
  id: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  vehicle: {
    id: string;
    registration: string;
    brand: string | null;
    model: string | null;
  } | null;
}

function throwAssignmentRepositoryError(error: { message: string }, context: string): never {
  throwIfSupabaseInfrastructureError(error, context);
  throw new Error(error.message);
}

/**
 * Repository pour les affectations véhicule–chauffeur et la liste des conducteurs.
 */
export class AssignmentRepository {
  async getDriversByFleet(fleetId: string): Promise<DriverRow[]> {
    const { data: memberships, error } = await supabase
      .from('flotte_adhesions')
      .select('user_id, role, is_active')
      .eq('fleet_id', fleetId)
      .eq('role', 'driver')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching drivers:', error);
      throwAssignmentRepositoryError(error, 'fleet drivers memberships');
    }

    const rows = memberships ?? [];
    const userIds = rows.map((row) => row.user_id);
    const { data: profiles, error: profilesError } = userIds.length
      ? await supabase
          .from('profils')
          .select('user_id, full_name, phone')
          .in('user_id', userIds)
      : { data: [], error: null };

    if (profilesError) {
      console.error('Error fetching driver profiles:', profilesError);
      throwAssignmentRepositoryError(profilesError, 'fleet driver profiles');
    }

    const profileByUserId = new Map(
      (profiles ?? []).map((profile) => [profile.user_id, profile]),
    );

    return rows.map((d) => ({
      user_id: d.user_id,
      full_name: profileByUserId.get(d.user_id)?.full_name ?? null,
      phone: profileByUserId.get(d.user_id)?.phone ?? null,
      role: d.role,
      is_active: d.is_active,
    }));
  }

  async getActiveAssignments(fleetId?: string): Promise<AssignmentRow[]> {
    let query = supabase
      .from('affectations_vehicules')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (fleetId) {
      query = query.eq('fleet_id', fleetId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching assignments:', error);
      throwAssignmentRepositoryError(error, 'active assignments');
    }

    const assignments = (data || []) as AssignmentRow[];
    if (assignments.length === 0) return [];

    const vehicleIds = [...new Set(assignments.map((row) => row.vehicle_id))];
    const driverIds = [...new Set(assignments.map((row) => row.driver_user_id))];
    const [{ data: vehicles, error: vehiclesError }, { data: profiles, error: profilesError }] =
      await Promise.all([
        vehicleIds.length
          ? supabase
              .from('vehicules')
              .select('id, registration, brand, model')
              .in('id', vehicleIds)
          : Promise.resolve({ data: [], error: null }),
        driverIds.length
          ? supabase
              .from('profils')
              .select('user_id, full_name')
              .in('user_id', driverIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (vehiclesError) throwAssignmentRepositoryError(vehiclesError, 'assignment vehicles');
    if (profilesError) throwAssignmentRepositoryError(profilesError, 'assignment driver profiles');

    const vehicleById = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));
    const profileByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));

    return assignments.map((assignment) => ({
      ...assignment,
      vehicle: vehicleById.get(assignment.vehicle_id) ?? null,
      driver: profileByUserId.get(assignment.driver_user_id) ?? null,
    }));
  }

  async getDriverAssignmentHistory(driverUserId: string): Promise<AssignmentHistoryRow[]> {
    const { data, error } = await supabase
      .from('affectations_vehicules')
      .select(
        `
        id,
        starts_at,
        ends_at,
        is_active,
        vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(id, registration, brand, model)
      `,
      )
      .eq('driver_user_id', driverUserId)
      .order('starts_at', { ascending: false });

    if (error) {
      throwAssignmentRepositoryError(error, 'driver assignment history');
    }

    return (data || []).map((row) => ({
      id: row.id,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      is_active: row.is_active,
      vehicle: asSingleRelation(row.vehicle),
    }));
  }

  async assignVehicle(params: {
    fleet_id: string;
    vehicle_id: string;
    driver_user_id: string;
    starts_at: string;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('affecter_vehicule', {
      p_fleet_id: params.fleet_id,
      p_vehicle_id: params.vehicle_id,
      p_driver_user_id: params.driver_user_id,
      p_starts_at: params.starts_at,
    });

    if (error) {
      console.error('Error assigning vehicle:', error);
      throwAssignmentRepositoryError(error, 'assign vehicle RPC');
    }

    return data as string;
  }

  async endAssignment(assignmentId: string): Promise<AssignmentRow> {
    const { data, error } = await supabase.rpc('delier_vehicule_chauffeur', {
      p_assignment_id: assignmentId,
    });

    if (error) {
      console.error('Error ending assignment:', error);
      throwAssignmentRepositoryError(error, 'end assignment RPC');
    }

    if (!data) {
      throw new Error('Affectation introuvable ou accès refusé');
    }

    return data as AssignmentRow;
  }
}
