import { supabase } from '@/integrations/supabase/client';

export type ShiftStatus = 'open' | 'closed';
export type CollectionMode = 'cash' | 'momo' | 'mix';

export interface DriverShift {
  id: string;
  assignment_id: string;
  km_start: number;
  km_end: number | null;
  started_at: string;
  ended_at: string | null;
  status: ShiftStatus;
  // Joined data via assignment
  assignment?: {
    id: string;
    fleet_id: string;
    vehicle_id: string;
    driver_user_id: string;
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
  } | null;
}

export interface ShiftClosure {
  id: string;
  shift_id: string;
  revenue_declared: number;
  expected_revenue: number | null;
  revenue_gap: number | null;
  collection_mode: CollectionMode;
  proof_type: string;
  proof_value: string;
  status: 'pending' | 'validated' | 'rejected';
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
}

export interface ShiftInsert {
  assignment_id: string;
  km_start: number;
}

export interface ShiftClosureInsert {
  shift_id: string;
  km_end: number;
  revenue_declared: number;
  collection_mode: CollectionMode;
  proof_type: string;
  proof_value: string;
}

export interface ShiftClosureUpdate {
  status?: 'pending' | 'validated' | 'rejected';
  validated_by?: string | null;
  validated_at?: string | null;
}

/**
 * Repository pour l'accès aux données des créneaux conducteurs
 */
export class DriverShiftRepository {
  /**
   * Récupère le créneau actif d'un conducteur
   */
  async findActiveShiftByDriverId(driverId: string): Promise<DriverShift | null> {
    // Récupérer l'affectation active du conducteur
    const { data: assignmentData } = await supabase
      .from('affectations_vehicules')
      .select('id')
      .eq('driver_user_id', driverId)
      .eq('is_active', true)
      .maybeSingle();

    if (!assignmentData) {
      return null;
    }

    // Récupérer le créneau actif pour cette affectation
    const { data, error } = await supabase
      .from('creneaux_conducteurs')
      .select(`
        *,
        assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
          id,
          fleet_id,
          vehicle_id,
          driver_user_id,
          vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(
            id,
            registration,
            brand,
            model
          ),
          driver:profils!affectations_vehicules_driver_user_id_fkey(
            user_id,
            full_name
          )
        )
      `)
      .eq('assignment_id', assignmentData.id)
      .eq('status', 'open')
      .maybeSingle();

    if (error) {
      console.error('Error fetching active shift:', error);
      throw new Error(error.message);
    }

    return data as DriverShift | null;
  }

  /**
   * Récupère tous les créneaux d'un conducteur
   */
  async findAllByDriverId(driverId: string, limit: number = 20): Promise<DriverShift[]> {
    // Récupérer toutes les affectations du conducteur
    const { data: assignmentsData } = await supabase
      .from('affectations_vehicules')
      .select('id')
      .eq('driver_user_id', driverId);

    if (!assignmentsData || assignmentsData.length === 0) {
      return [];
    }

    const assignmentIds = assignmentsData.map((a) => a.id);

    // Récupérer les créneaux pour ces affectations
    const { data, error } = await supabase
      .from('creneaux_conducteurs')
      .select(`
        *,
        assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
          id,
          fleet_id,
          vehicle_id,
          driver_user_id,
          vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(
            id,
            registration,
            brand,
            model
          ),
          driver:profils!affectations_vehicules_driver_user_id_fkey(
            user_id,
            full_name
          )
        )
      `)
      .in('assignment_id', assignmentIds)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching shifts:', error);
      throw new Error(error.message);
    }

    return (data || []) as DriverShift[];
  }

  /**
   * Récupère un créneau par son ID
   */
  async findById(shiftId: string): Promise<DriverShift | null> {
    const { data, error } = await supabase
      .from('creneaux_conducteurs')
      .select(`
        *,
        assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
          id,
          fleet_id,
          vehicle_id,
          driver_user_id,
          vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(
            id,
            registration,
            brand,
            model
          ),
          driver:profils!affectations_vehicules_driver_user_id_fkey(
            user_id,
            full_name
          )
        )
      `)
      .eq('id', shiftId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching shift:', error);
      throw new Error(error.message);
    }

    return data as DriverShift;
  }

  /**
   * Crée un nouveau créneau (démarre un créneau)
   */
  async create(shift: ShiftInsert): Promise<DriverShift> {
    const { data, error } = await supabase
      .from('creneaux_conducteurs')
      .insert({
        assignment_id: shift.assignment_id,
        km_start: shift.km_start,
        status: 'open',
      })
      .select(`
        *,
        assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
          id,
          fleet_id,
          vehicle_id,
          driver_user_id,
          vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(
            id,
            registration,
            brand,
            model
          )
        )
      `)
      .single();

    if (error) {
      console.error('Error creating shift:', error);
      throw new Error(error.message);
    }

    return data as DriverShift;
  }

  /**
   * Ferme un créneau via la fonction RPC
   */
  async closeShift(closure: ShiftClosureInsert): Promise<void> {
    const { error } = await supabase.rpc('fermer_creneau', {
      p_shift_id: closure.shift_id,
      p_km_end: closure.km_end,
      p_revenue_declared: closure.revenue_declared,
      p_collection_mode: closure.collection_mode,
      p_proof_type: closure.proof_type,
      p_proof_value: closure.proof_value,
    });

    if (error) {
      console.error('Error closing shift:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Calcule la recette attendue pour un créneau
   */
  async calculateExpectedRevenue(shiftId: string): Promise<void> {
    const { error } = await supabase.rpc('calculer_recette_attendue', {
      p_shift_id: shiftId,
    });

    if (error) {
      console.warn('Error calculating expected revenue:', error);
      // Ne pas bloquer si cette étape échoue
    }
  }

  /**
   * Récupère le véhicule associé à un créneau
   */
  async getVehicleIdByShiftId(shiftId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('creneaux_conducteurs')
      .select(`
        assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
          vehicle_id
        )
      `)
      .eq('id', shiftId)
      .single();

    if (error) {
      console.error('Error fetching vehicle ID:', error);
      return null;
    }

    return (data as any)?.assignment?.vehicle_id || null;
  }

  /**
   * Récupère toutes les clôtures d'un conducteur
   */
  async findAllClosuresByDriverId(driverId: string): Promise<ShiftClosure[]> {
    // Récupérer les affectations du conducteur
    const { data: assignmentsData } = await supabase
      .from('affectations_vehicules')
      .select('id')
      .eq('driver_user_id', driverId);

    if (!assignmentsData || assignmentsData.length === 0) {
      return [];
    }

    const assignmentIds = assignmentsData.map((a) => a.id);

    // Récupérer les créneaux pour ces affectations
    const { data: shiftsData } = await supabase
      .from('creneaux_conducteurs')
      .select('id')
      .in('assignment_id', assignmentIds);

    if (!shiftsData || shiftsData.length === 0) {
      return [];
    }

    const shiftIds = shiftsData.map((s) => s.id);

    // Récupérer les clôtures pour ces créneaux
    const { data, error } = await supabase
      .from('clotures_creneaux')
      .select('*')
      .in('shift_id', shiftIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching closures:', error);
      return [];
    }

    return (data || []) as ShiftClosure[];
  }

  /**
   * Met à jour une clôture (validation/rejet)
   */
  async updateClosure(closureId: string, updates: ShiftClosureUpdate): Promise<ShiftClosure> {
    const { data, error } = await supabase
      .from('clotures_creneaux')
      .update(updates)
      .eq('id', closureId)
      .select()
      .single();

    if (error) {
      console.error('Error updating closure:', error);
      throw new Error(error.message);
    }

    return data as ShiftClosure;
  }
}
