import { supabase } from '@/integrations/supabase/client';
import { throwIfSupabaseInfrastructureError } from '@/lib/supabase-runtime-errors';

export type PlannedShiftStatus = 'draft' | 'confirmed' | 'started' | 'cancelled' | 'missed';

export interface PlannedShift {
  id: string;
  fleet_id: string;
  driver_user_id: string;
  vehicle_id: string;
  planned_start: string;
  planned_end: string | null;
  status: PlannedShiftStatus;
  creneau_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  driver?: { user_id: string; full_name: string | null } | null;
  vehicle?: {
    id: string;
    registration: string;
    brand: string | null;
    model: string | null;
  } | null;
}

export interface PlannedShiftInsert {
  fleet_id: string;
  driver_user_id: string;
  vehicle_id: string;
  planned_start: string;
  planned_end?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

const SELECT_WITH_JOINS = `
  *,
  vehicle:vehicules!planning_creneaux_vehicle_id_fkey(id, registration, brand, model)
`;

function throwPlannedShiftRepositoryError(error: { message: string }, context: string): never {
  throwIfSupabaseInfrastructureError(error, context);
  throw new Error(error.message);
}

/**
 * Repository pour la planification de créneaux conducteurs.
 */
export class PlannedShiftRepository {
  async findByFleetToday(fleetId: string): Promise<PlannedShift[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const { data, error } = await supabase
      .from('planning_creneaux')
      .select(SELECT_WITH_JOINS)
      .eq('fleet_id', fleetId)
      .gte('planned_start', startOfDay.toISOString())
      .lt('planned_start', endOfDay.toISOString())
      .in('status', ['confirmed', 'started', 'missed'])
      .order('planned_start', { ascending: true });

    if (error) {
      console.error('Error fetching planned shifts for fleet:', error);
      throwPlannedShiftRepositoryError(error, 'planned shifts by fleet');
    }

    return (data || []) as PlannedShift[];
  }

  async findUpcomingForDriver(driverUserId: string): Promise<PlannedShift | null> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('planning_creneaux')
      .select(SELECT_WITH_JOINS)
      .eq('driver_user_id', driverUserId)
      .eq('status', 'confirmed')
      .gte('planned_start', windowStart.toISOString())
      .order('planned_start', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching upcoming planned shift:', error);
      throwPlannedShiftRepositoryError(error, 'planned shifts by driver');
    }

    return data as PlannedShift | null;
  }

  async create(input: PlannedShiftInsert): Promise<PlannedShift> {
    const { data, error } = await supabase
      .from('planning_creneaux')
      .insert({
        fleet_id: input.fleet_id,
        driver_user_id: input.driver_user_id,
        vehicle_id: input.vehicle_id,
        planned_start: input.planned_start,
        planned_end: input.planned_end ?? null,
        notes: input.notes?.trim() || null,
        created_by: input.created_by ?? null,
        status: 'confirmed',
      })
      .select(SELECT_WITH_JOINS)
      .single();

    if (error) {
      console.error('Error creating planned shift:', error);
      throwPlannedShiftRepositoryError(error, 'planned shift create');
    }

    return data as PlannedShift;
  }

  async linkToCreneau(plannedShiftId: string, creneauId: string): Promise<void> {
    const { error } = await supabase
      .from('planning_creneaux')
      .update({ status: 'started', creneau_id: creneauId })
      .eq('id', plannedShiftId)
      .eq('status', 'confirmed');

    if (error) {
      console.error('Error linking planned shift to creneau:', error);
      throwPlannedShiftRepositoryError(error, 'planned shift link');
    }
  }

  async cancel(plannedShiftId: string): Promise<void> {
    const { error } = await supabase
      .from('planning_creneaux')
      .update({ status: 'cancelled' })
      .eq('id', plannedShiftId)
      .in('status', ['draft', 'confirmed']);

    if (error) {
      console.error('Error cancelling planned shift:', error);
      throwPlannedShiftRepositoryError(error, 'planned shift cancel');
    }
  }
}
