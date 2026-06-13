import { supabase } from '@/integrations/supabase/client';

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

/**
 * Repository pour les affectations véhicule–chauffeur et la liste des conducteurs.
 */
export class AssignmentRepository {
  async getDriversByFleet(fleetId: string): Promise<DriverRow[]> {
    const { data, error } = await supabase
      .from('flotte_adhesions')
      .select(
        `
        user_id,
        role,
        is_active,
        profile:profils!flotte_adhesions_user_id_fkey(user_id, full_name, phone)
      `
      )
      .eq('fleet_id', fleetId)
      .eq('role', 'driver')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching drivers:', error);
      throw new Error(error.message);
    }

    return (data || []).map((d: { user_id: string; role: string; is_active: boolean; profile?: { full_name: string | null; phone: string | null } | null }) => ({
      user_id: d.user_id,
      full_name: d.profile?.full_name ?? null,
      phone: d.profile?.phone ?? null,
      role: d.role,
      is_active: d.is_active,
    }));
  }

  async getActiveAssignments(fleetId?: string): Promise<AssignmentRow[]> {
    let query = supabase
      .from('affectations_vehicules')
      .select(
        `
        *,
        vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(id, registration, brand, model),
        driver:profils!affectations_vehicules_driver_user_id_fkey(user_id, full_name)
      `
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (fleetId) {
      query = query.eq('fleet_id', fleetId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching assignments:', error);
      throw new Error(error.message);
    }

    return (data || []) as AssignmentRow[];
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
      throw new Error(error.message);
    }

    return (data || []) as AssignmentHistoryRow[];
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
      throw new Error(error.message);
    }

    return data as string;
  }

  async endAssignment(assignmentId: string): Promise<AssignmentRow> {
    const { data, error } = await supabase
      .from('affectations_vehicules')
      .update({
        is_active: false,
        ends_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error ending assignment:', error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Affectation introuvable ou accès refusé');
    }

    return data as AssignmentRow;
  }
}
